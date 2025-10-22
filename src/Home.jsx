import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  CircularProgress // Yükleme göstergesi için eklendi
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import BarChartIcon from "@mui/icons-material/BarChart";
import ThemeToggle from "./components/ThemeToggle";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { tr } from "date-fns/locale";
import { DatePicker } from "@mui/x-date-pickers";
import Tooltip from "@mui/material/Tooltip";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import LogoutIcon from '@mui/icons-material/Logout';

export default function Home() {
  const API_URL = process.env.REACT_APP_API_URL;
  const [columns, setColumns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newOrder, setNewOrder] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const navigate = useNavigate();
  const theme = useTheme();
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteOrderId, setNoteOrderId] = useState(null);
  const [selectedNoteOrder, setSelectedNoteOrder] = useState(null);
  // --- YENİ: Yükleniyor durumu eklendi ---
  const [loading, setLoading] = useState(true);
  // --- EKLENEN BÖLÜM SONU ---


  const handleUnauthorized = (error) => {
    // Yanıtı veya doğrudan hata nesnesini kontrol et
    const status = error.response ? error.response.status : (error instanceof Response ? error.status : null);
     if (status === 401) {
        localStorage.removeItem("authToken");
        navigate("/");
    } else {
        // Diğer hatalar için genel bir loglama veya kullanıcı bildirimi
        console.error("Beklenmedik bir hata oluştu:", error);
    }
  };

  useEffect(() => {
    setLoading(true); // Yüklemeyi başlat
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/");
      // setLoading(false); // Gerekirse, ama zaten yönlendiriliyor
      return;
    }

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    const fetchColumnsAndOrders = async () => {
      try {
        // Kolonları çek (Promise.all ile paralel yapabiliriz)
        const colsPromise = fetch(`${API_URL}/orders/columns`, authHeaders);
        const ordersPromise = fetch(`${API_URL}/orders`, authHeaders);

        const [colsRes, ordersRes] = await Promise.all([colsPromise, ordersPromise]);

        // Hata kontrolü
        if (!colsRes.ok) throw colsRes; // Artık Response objesini fırlatıyoruz
        if (!ordersRes.ok) throw ordersRes;

        const colsJson = await colsRes.json();
        const cols = colsJson.columns.filter(
          (col) => col !== "id" && col !== "verildigi_tarih"
        );
        setColumns(cols);

        // Form başlangıç durumu artık columns'a bağlı değil, sabit olabilir
        // İstersen burada bırakabilirsin ya da sabit tanımlayabilirsin.
        const formInit = {};
        cols.forEach((col) => { formInit[col] = ""; });
        // setNewOrder(formInit); // Sadece edit modunda set edilecek

        const orderData = await ordersRes.json();
        const sortedOrders = orderData
          .filter(order => order.yapilacak_tarih)
          .sort((a, b) => new Date(a.yapilacak_tarih) - new Date(b.yapilacak_tarih));
        setOrders(sortedOrders);

      } catch (err) {
        console.error("Veri çekme hatası:", err);
        handleUnauthorized(err); // Hata yönetimini çağır
      } finally {
         setLoading(false); // Yüklemeyi bitir (başarılı veya hatalı)
      }
    };
    fetchColumnsAndOrders();
  }, [API_URL, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewOrder((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditNote = (order) => {
    setSelectedNoteOrder(order);
    setNoteContent(order.notlar || "");
    setNoteOrderId(order.id);
    setNoteDialogOpen(true);
  };


  const handleNoteSave = async () => {
    const token = localStorage.getItem("authToken");
    if (!selectedNoteOrder) return;

    try {
      const payload = { notlar: noteContent };
      const response = await fetch(`${API_URL}/orders/${selectedNoteOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
       if (!response.ok) throw response; // Artık Response objesini fırlatıyoruz

      setOrders(prevOrders =>
        prevOrders.map(o =>
          o.id === selectedNoteOrder.id ? { ...o, notlar: noteContent } : o
        )
      );
      setNoteDialogOpen(false);
      setSelectedNoteOrder(null);
      setNoteContent("");
      setNoteOrderId(null);
    } catch (err) {
      console.error("Notlar güncelleme hatası:", err);
      handleUnauthorized(err);
    }
  };


  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("authToken");
    const url = editingId
      ? `${API_URL}/orders/${editingId}`
      : `${API_URL}/orders`;
    const method = editingId ? "PUT" : "POST";

    const orderPayload = { ...newOrder };
    if (orderPayload.yapilacak_tarih && typeof orderPayload.yapilacak_tarih === 'string') {
        try {
            // datetime-local'den gelen formatı direkt ISO'ya çevirebiliriz
            // Zaman dilimi sorunlarını önlemek için UTC'ye çevirme.
            // Backend zaten bunu string olarak bekliyor olmalı (schema güncellemesi sonrası)
             orderPayload.yapilacak_tarih = new Date(orderPayload.yapilacak_tarih).toISOString();
        } catch (dateErr) {
            console.error("Geçersiz tarih formatı:", orderPayload.yapilacak_tarih);
            return;
        }
    } else if (!orderPayload.yapilacak_tarih && method === 'POST') {
        // Yeni siparişte tarih zorunluysa burada kontrol ekle
         console.error("Yapılacak tarih zorunludur.");
         return; // veya kullanıcıya mesaj göster
    }


    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(orderPayload),
      });
      if (!response.ok) throw response; // Artık Response objesini fırlatıyoruz

      setShowForm(false);
      setEditingId(null);
      setNewOrder({}); // Formu temizle

      // Veriyi tekrar çek
      const ordersRes = await fetch(`${API_URL}/orders`, { headers: { Authorization: `Bearer ${token}` } });
      if (!ordersRes.ok) throw ordersRes;
      const updated = await ordersRes.json();
      setOrders(updated.filter(o => o.yapilacak_tarih).sort((a, b) => new Date(a.yapilacak_tarih) - new Date(b.yapilacak_tarih)));
    } catch (err) {
      console.error("Sipariş kaydetme hatası:", err);
      handleUnauthorized(err);
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("authToken");
    try {
      const response = await fetch(`${API_URL}/orders/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
      });
       if (!response.ok) throw response; // Artık Response objesini fırlatıyoruz
      setOrders(prevOrders => prevOrders.filter(order => order.id !== id));
    } catch (err) {
      console.error("Silme hatası:", err);
      handleUnauthorized(err);
    }
  };

  const handleEdit = (order) => {
    const editable = { ...order };
    delete editable.id;
    delete editable.verildigi_tarih;

     if (editable.yapilacak_tarih) {
        try {
            const date = new Date(editable.yapilacak_tarih);
            // Zaman dilimi ofsetini hesaba katmadan, yerel saati alıp ISO'ya çevir
            // YYYY-MM-DDTHH:mm formatı için slice(0, 16)
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            editable.yapilacak_tarih = `${year}-${month}-${day}T${hours}:${minutes}`;

        } catch (e) {
             console.error("Düzenleme için tarih formatı hatası:", e);
             editable.yapilacak_tarih = "";
        }
    } else {
        editable.yapilacak_tarih = "";
    }


    setNewOrder(editable);
    setEditingId(order.id);
    setShowForm(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/");
  };

  const now = new Date();
  const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);

  // YENİ: orders state'i henüz yüklenmediyse filtreleme yapma
  const filteredOrders = !loading ? orders
    .map((order) => {
      const yapilacakTarih = order.yapilacak_tarih
        ? new Date(order.yapilacak_tarih)
        : null;
      return {
        ...order,
        yapildi: yapilacakTarih && yapilacakTarih <= fiveHoursAgo,
      };
    })
    .filter((order) => {
      const yapilacakTarih = order.yapilacak_tarih
        ? new Date(order.yapilacak_tarih)
        : null;

      if (!yapilacakTarih) {
          if (!dateFrom && !dateTo && filterType === 'all') {
               const stringMatch = [
                    order.musteri_isim, order.musteri_telefon, order.siparis, order.ekip,
               ].filter(Boolean).join(" ").toLowerCase().includes(searchQuery.toLowerCase());
               return stringMatch;
          }
          return false;
      }


      const tarih = yapilacakTarih.getTime();
      const from = dateFrom ? new Date(new Date(dateFrom).setHours(0, 0, 0, 0)).getTime() : null;
      const to = dateTo ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)).getTime() : null;
      const dateMatch = (!from || tarih >= from) && (!to || tarih <= to);

      const stringMatch = [
        order.musteri_isim, order.musteri_telefon, order.siparis, order.ekip,
      ].filter(Boolean).join(" ").toLowerCase().includes(searchQuery.toLowerCase());

      const filterMatch =
        filterType === "all" ? true : filterType === "done" ? order.yapildi : !order.yapildi;

      return dateMatch && stringMatch && filterMatch;
    })
    .sort((a, b) => {
      if (!a.yapilacak_tarih || !b.yapilacak_tarih) return 0;
      const aTime = new Date(a.yapilacak_tarih);
      const bTime = new Date(b.yapilacak_tarih);
      if (a.yapildi && b.yapildi) return bTime - aTime;
      if (!a.yapildi && !b.yapildi) return aTime - bTime;
      return a.yapildi ? 1 : -1;
    }) : []; // Yükleniyorsa boş dizi döndür

    // YENİ: Yükleniyor durumu ekranda göster
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

  return (
    <Box sx={{ p: 4, minHeight: "100vh", backgroundColor: theme.palette.background.default }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">📦 Sipariş Listesi</Typography>
        <Stack direction="row" spacing={1}>
          <ThemeToggle />
          <Button variant="contained" startIcon={<BarChartIcon />} onClick={() => navigate("/dashboard")}>
            Dashboard
          </Button>
          <Button variant="contained" color="primary" onClick={() => navigate("/giderler")}>
            Giderler
          </Button>
          {/* YENİ: Çıkış yap butonu eklendi */}
          <Button variant="contained" color="error" startIcon={<LogoutIcon />} onClick={handleLogout}>
            Çıkış Yap
          </Button>
        </Stack>
      </Stack>

      {/* ... (Kodunun geri kalan kısmı aynı, burada bir değişiklik yok) ... */}
      <Stack direction="row" spacing={2} mb={3}>
        <TextField
          label="Ara..."
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ backgroundColor: theme.palette.mode === "dark" ? "#2c2c2c" : "#f5f5f5", borderRadius: 1 }}
        />
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              <DatePicker
                label="Başlangıç Tarihi"
                value={dateFrom}
                onChange={(newValue) => setDateFrom(newValue)}
                slotProps={{
                  textField: {
                    variant: "outlined",
                    InputProps: { readOnly: true },
                  },
                }}
              />
              <DatePicker
                label="Bitiş Tarihi"
                value={dateTo}
                onChange={(newValue) => setDateTo(newValue)}
                slotProps={{
                  textField: {
                    variant: "outlined",
                    inputProps: { readOnly: true },
                  },
                }}
              />
            </Stack>

            {/* Temizleme İkonu */}
            <Tooltip title="Tarih filtresini temizle">
              <IconButton
                color="primary"
                onClick={() => {
                  setDateFrom(null);
                  setDateTo(null);
                }}
              >
                <CleaningServicesIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </LocalizationProvider>

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setShowForm(true)}
          sx={{
            color: "#000",
            backgroundColor: theme.palette.mode === "dark" ? "#fff" : "#f5f5f5",
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.25)",
            "&:hover": {
              backgroundColor: theme.palette.mode === "dark" ? "#e0e0e0" : "#e0e0e0",
              boxShadow: "0px 6px 16px rgba(0, 0, 0, 0.3)",
            },
          }}
        >
          YENİ SİPARİŞ
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} mt={1} mb={2}>
        <Button variant={filterType === "all" ? "contained" : "outlined"} onClick={() => setFilterType("all")}>
          Tüm Siparişler
        </Button>
        <Button variant={filterType === "pending" ? "contained" : "outlined"} onClick={() => setFilterType("pending")} color="warning">
          Gelecek Siparişler
        </Button>
        <Button variant={filterType === "done" ? "contained" : "outlined"} onClick={() => setFilterType("done")} color="success">
          Geçmiş Siparişler
        </Button>
      </Stack>

      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <DialogTitle>{editingId ? "Siparişi Güncelle" : "Yeni Sipariş"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {Object.keys(newOrder).map((col) => (
              <TextField
                key={col}
                name={col}
                label={col.replaceAll("_", " ")}
                value={newOrder[col] || ''} // YENİ: Kontrolsüz bileşeni önlemek için
                onChange={handleInputChange}
                type={
                  col.includes("tarih")
                    ? "datetime-local"
                    : col === "fiyat"
                    ? "number"
                    : "text"
                }
                InputLabelProps={col.includes("tarih") ? { shrink: true } : undefined}
                multiline={col === "notlar"}
                rows={col === "notlar" ? 2 : undefined}
                required={col !== "notlar"}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowForm(false)}>İptal</Button>
          <Button variant="contained" onClick={handleFormSubmit}>
            {editingId ? "Güncelle" : "Kaydet"}
          </Button>
        </DialogActions>
      </Dialog>
<Dialog
  open={noteDialogOpen}
  onClose={() => setNoteDialogOpen(false)}
  maxWidth="sm"
  fullWidth
  PaperProps={{
    sx: {
      borderRadius: 3,
      p: 2,
    },
  }}
>
  <DialogTitle
    sx={{
      textAlign: "center",
      fontWeight: "bold",
      fontSize: 22,
      color: "#1976d2",
    }}
  >
    📝 Notlar
  </DialogTitle>

  <DialogContent>
    <Box
      sx={{
        backgroundColor: "#f9f9f9",
        border: "1px solid #ddd",
        borderRadius: 2,
        padding: 2,
        minHeight: "80px",
      }}
    >
      <Typography
        variant="body1"
        sx={{
          whiteSpace: "pre-wrap",
          fontSize: 16,
          color: "#333",
        }}
      >
        {noteContent}
      </Typography>
    </Box>
  </DialogContent>

  <DialogActions sx={{ justifyContent: "center" }}>
    <Button
      variant="contained"
      color="primary"
      onClick={() => setNoteDialogOpen(false)}
      sx={{ mt: 1 }}
    >
      Kapat
    </Button>
  </DialogActions>
</Dialog>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ backgroundColor: "#1976d2", color: "white", fontWeight: "bold" }}>Saat</TableCell>
              <TableCell sx={{ backgroundColor: "#1976d2", color: "white", fontWeight: "bold" }}>Yapılacak Tarih</TableCell>
              {columns
  .filter((col) => col !== "id" && col !== "yapilacak_tarih" && col !== "verildigi_tarih" && col !== "notlar")
  .map((col) => {
    const headers = {
      siparis: "Sipariş",
      musteri_isim: "Müşteri İsmi",
      musteri_telefon: "Müşteri Telefonu",
      ekip: "Ekip",
      adres: "Adres",
      fiyat: "Fiyat",
      notlar: "Notlar"
    };

    return (
      <TableCell
        key={col}
        sx={{
          backgroundColor: "#1976d2",
          color: "white",
          fontWeight: "bold",
        }}
      >
        {headers[col] || col}
      </TableCell>
    );
  })}
              <TableCell sx={{ backgroundColor: "#1976d2", color: "white", fontWeight: "bold" }}>İşlem</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.map((order, idx) => {
              // YENİ: Tarih objesinin null olup olmadığını kontrol et
              const dateObj = order.yapilacak_tarih ? new Date(order.yapilacak_tarih) : null;
              const saat = dateObj ? dateObj.toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }) : "N/A";
              const tarih = dateObj ? dateObj.toLocaleDateString("tr-TR") : "N/A";
              return (
                <TableRow
                  key={order.id || idx} // YENİ: Benzersiz key için order.id kullan
                  sx={{
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? idx % 2 === 0
                          ? "#1e1e1e"
                          : "#2c2c2c"
                        : idx % 2 === 0
                        ? "#f9f9f9"
                        : "#ffffff",
                    "&:hover": {
                      backgroundColor: theme.palette.mode === "dark" ? "#37474f" : "#e0f7fa",
                    },
                  }}
                >
                  <TableCell>{saat}</TableCell>
                  <TableCell>{tarih}</TableCell>
                  {columns
                    .filter((col) => col !== "id" && col !== "yapilacak_tarih" && col !== "verildigi_tarih" && col !== "notlar")
                    .map((col) => (
                      <TableCell key={col}>{order[col]}</TableCell>
                    ))}
                  <TableCell>
                    <IconButton onClick={() => handleEdit(order)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(order.id)}>
                      <DeleteIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        setNoteContent(order.notlar || "");
                        setNoteOrderId(order.id);
                        setNoteDialogOpen(true);
                      }}
                      sx={{ ml: 1 }}
                    >
                      📝
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

