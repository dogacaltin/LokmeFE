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
  const [loading, setLoading] = useState(true);


  // --- GÜNCELLENDİ: handleUnauthorized (Daha Detaylı Loglama) ---
  const handleUnauthorized = async (error, context = "Unknown") => { // Context eklendi
    console.error(`Authorization Error Handler Triggered from [${context}]:`, error); // Hatanın nereden geldiğini logla

    let status = null;
    let errorDetail = "Bilinmeyen Hata";
    let responseBody = null; // Yanıt gövdesini saklamak için

    // Hatanın fetch'ten gelen Response objesi mi yoksa başka bir hata mı olduğunu kontrol et
    if (error instanceof Response) {
        status = error.status;
        try {
            // Yanıt gövdesini JSON olarak okumaya çalış
            responseBody = await error.clone().json(); // .clone() önemli! Body bir kez okunabilir.
            errorDetail = responseBody.detail || error.statusText;
            console.error(`API Response Error: Status ${status}, Detail: ${errorDetail}`, "Response Body:", responseBody);
        } catch (jsonError) {
            // Yanıt gövdesi JSON değilse veya okunamıyorsa, text olarak okumayı dene
             try {
                 responseBody = await error.text();
                 errorDetail = error.statusText;
                 console.error(`API Response Error: Status ${status}, Body is not JSON. Body Text:`, responseBody);
             } catch (textError) {
                 errorDetail = error.statusText;
                 console.error(`API Response Error: Status ${status}, Could not parse response body.`);
             }
        }
    } else if (error.response) { // Axios gibi kütüphanelerden gelen hata
        status = error.response.status;
        responseBody = error.response.data;
        errorDetail = error.response.data?.detail || error.message;
        console.error(`Library Error Response: Status ${status}, Detail: ${errorDetail}`, "Response Data:", responseBody);
    }
     else { // Ağ hatası veya diğer JavaScript hataları
        errorDetail = error.message || "Ağ hatası veya beklenmedik bir sorun.";
        console.error("Non-HTTP Error:", errorDetail, error);
    }

    // Sadece 401 durumunda çıkış yap
    if (status === 401) {
        console.warn("Unauthorized (401) confirmed, logging out. Token might be expired or invalid."); // Uyarı logu
        localStorage.removeItem("authToken");
        // navigate("/") çağrısını daha güvenli hale getir
        // Eğer component hala mount edilmişse yönlendir
        // Bu genellikle useEffect cleanup içinde kontrol edilir, ama burada da bir kontrol ekleyebiliriz.
         // Kısa bir gecikme ekleyerek navigate'in çalışmasını garantiye almayı dene (son çare)
        setTimeout(() => navigate("/"), 50); // Çok kısa bir gecikme
    } else {
         console.log(`Error status ${status || 'N/A'} encountered in context [${context}], not logging out.`);
         // Kullanıcıya genel bir hata mesajı gösterilebilir
         // Örneğin: alert(`Bir hata oluştu: ${errorDetail}`);
    }
  };
  // --- GÜNCELLEME SONU ---

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const token = localStorage.getItem("authToken");
    const tokenTimestamp = localStorage.getItem("authTokenTimestamp"); // Token alınma zamanını da oku
    const now = Date.now();
    let isTokenPotentiallyExpired = false;

    // Token alınma zamanı varsa ve 1 saatten fazla geçmişse logla
    if (tokenTimestamp) {
        const tokenAgeMinutes = (now - parseInt(tokenTimestamp, 10)) / (1000 * 60);
        console.log(`useEffect: Token age is approx ${tokenAgeMinutes.toFixed(1)} minutes.`);
        if (tokenAgeMinutes > 58) { // 1 saatten biraz az kontrol et
             console.warn("useEffect: Token is older than 58 minutes, potentially expired.");
             isTokenPotentiallyExpired = true; // Potansiyel süre aşımı
        }
    }


    console.log("useEffect: Checking token...", token ? `Token found (potentially expired: ${isTokenPotentiallyExpired})` : "No token found");

    if (!token) {
      console.log("useEffect: No token, navigating to login.");
      // setLoading(false); // Yönlendirme yapıldığı için gerek yok
      navigate("/");
      return; // Token yoksa işlemi durdur
    }

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    console.log("useEffect: Preparing to fetch data with token.");

    const fetchColumnsAndOrders = async () => {
      try {
        console.log("useEffect: Fetching columns...");
        const colsPromise = fetch(`${API_URL}/orders/columns`, authHeaders);
        console.log("useEffect: Fetching orders...");
        const ordersPromise = fetch(`${API_URL}/orders`, authHeaders);

        const [colsRes, ordersRes] = await Promise.all([colsPromise, ordersPromise]);
        console.log("useEffect: Fetch responses received. Columns Status:", colsRes.status, "Orders Status:", ordersRes.status);

        // Component hala bağlıysa state'i güncelle
        if (isMounted) {
            console.log("useEffect: Component is mounted, checking responses...");
            // Her iki isteğin de başarılı olduğundan emin ol
            if (!colsRes.ok) {
                console.error("useEffect: Columns fetch failed!");
                throw colsRes; // Hata olarak Response objesini fırlat
            }
            if (!ordersRes.ok) {
                 console.error("useEffect: Orders fetch failed!");
                throw ordersRes; // Hata olarak Response objesini fırlat
            }

            console.log("useEffect: Both fetches successful, processing data...");
            const colsJson = await colsRes.json();
            const cols = colsJson.columns.filter(
              (col) => col !== "id" && col !== "verildigi_tarih"
            );
            setColumns(cols);

            const orderData = await ordersRes.json();
            const sortedOrders = orderData
              .filter(order => order.yapilacak_tarih)
              .sort((a, b) => new Date(a.yapilacak_tarih) - new Date(b.yapilacak_tarih));
            setOrders(sortedOrders);
            console.log("useEffect: Data processed and state updated successfully.");

        } else {
             console.log("useEffect: Component unmounted before processing responses.");
        }

      } catch (err) {
        // Hata zaten Response objesi olarak fırlatılmış olmalı
        console.error("useEffect: Error during fetch process (before handleUnauthorized):", err);
         if (isMounted) {
            console.log("useEffect: Calling handleUnauthorized due to fetch error.");
            // Hata yönetimini çağırırken context'i belirt
            handleUnauthorized(err, "useEffect fetch");
         }
      } finally {
         if (isMounted) {
            console.log("useEffect: Fetch process finished, setting loading to false.");
            setLoading(false);
         }
      }
    };

    fetchColumnsAndOrders();

    return () => {
        console.log("useEffect: Cleanup function called, component unmounting.");
        isMounted = false;
    };

  }, [API_URL, navigate]);

   // Diğer fonksiyonlar aynı kalıyor...
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
       if (!response.ok) throw response;

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
      handleUnauthorized(err, "handleNoteSave"); // Context eklendi
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
             orderPayload.yapilacak_tarih = new Date(orderPayload.yapilacak_tarih).toISOString();
        } catch (dateErr) {
            console.error("Geçersiz tarih formatı:", orderPayload.yapilacak_tarih);
            return;
        }
    } else if (!orderPayload.yapilacak_tarih && method === 'POST') {
         console.error("Yapılacak tarih zorunludur.");
         return;
    }


    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(orderPayload),
      });
      if (!response.ok) throw response;

      setShowForm(false);
      setEditingId(null);
      setNewOrder({});

      const ordersRes = await fetch(`${API_URL}/orders`, { headers: { Authorization: `Bearer ${token}` } });
      if (!ordersRes.ok) throw ordersRes;
      const updated = await ordersRes.json();
      setOrders(updated.filter(o => o.yapilacak_tarih).sort((a, b) => new Date(a.yapilacak_tarih) - new Date(b.yapilacak_tarih)));
    } catch (err) {
      console.error("Sipariş kaydetme hatası:", err);
      handleUnauthorized(err, "handleFormSubmit"); // Context eklendi
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("authToken");
    try {
      const response = await fetch(`${API_URL}/orders/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
      });
       if (!response.ok) throw response;
      setOrders(prevOrders => prevOrders.filter(order => order.id !== id));
    } catch (err) {
      console.error("Silme hatası:", err);
      handleUnauthorized(err, "handleDelete"); // Context eklendi
    }
  };

  const handleEdit = (order) => {
    const editable = { ...order };
    delete editable.id;
    delete editable.verildigi_tarih;

     if (editable.yapilacak_tarih) {
        try {
            const date = new Date(editable.yapilacak_tarih);
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
    console.log("handleLogout called."); // Çıkış fonksiyonunu logla
    localStorage.removeItem("authToken");
    localStorage.removeItem("authTokenTimestamp"); // Zaman damgasını da sil
    navigate("/");
  };

    // Yükleniyor durumu ekranda göster
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
                 <Typography sx={{ ml: 2 }}>Veriler yükleniyor...</Typography> {/* Kullanıcıya bilgi ver */}
            </Box>
        );
    }

    // JSX kısmı (return (...)) aynı kalıyor...
    const now = new Date();
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);

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
      }) : [];

      if (loading) {
          return (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                  <CircularProgress />
                   <Typography sx={{ ml: 2 }}>Veriler yükleniyor...</Typography>
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
            <Button variant="contained" color="error" startIcon={<LogoutIcon />} onClick={handleLogout}>
              Çıkış Yap
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2} mb={3}>
          <TextField
            label="Ara..."
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ backgroundColor: theme.palette.mode === "dark" ? "#2c2c2c" : "#f5f5f5", borderRadius: 1, flexGrow: 1 }}
          />
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
            <Stack direction="row" spacing={1} alignItems="center">
                <DatePicker
                  label="Başlangıç Tarihi"
                  value={dateFrom}
                  onChange={(newValue) => setDateFrom(newValue)}
                  slotProps={{ textField: { size: 'small' } }}
                />
                <DatePicker
                  label="Bitiş Tarihi"
                  value={dateTo}
                  onChange={(newValue) => setDateTo(newValue)}
                   slotProps={{ textField: { size: 'small' } }}
                />
                <Tooltip title="Tarih filtresini temizle">
                  <IconButton color="primary" onClick={() => { setDateFrom(null); setDateTo(null); }}>
                    <CleaningServicesIcon />
                  </IconButton>
                </Tooltip>
            </Stack>
          </LocalizationProvider>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
                const formInit = {};
                columns.forEach((col) => { formInit[col] = ""; });
                setNewOrder(formInit);
                setEditingId(null);
                setShowForm(true);
            }}
            size="medium"
          >
            YENİ SİPARİŞ
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} mt={1} mb={2}>
          <Button size="small" variant={filterType === "all" ? "contained" : "outlined"} onClick={() => setFilterType("all")}>
            Tüm Siparişler
          </Button>
          <Button size="small" variant={filterType === "pending" ? "contained" : "outlined"} onClick={() => setFilterType("pending")} color="warning">
            Gelecek Siparişler
          </Button>
          <Button size="small" variant={filterType === "done" ? "contained" : "outlined"} onClick={() => setFilterType("done")} color="success">
            Geçmiş Siparişler
          </Button>
        </Stack>

        <Dialog open={showForm} onClose={() => { setShowForm(false); setEditingId(null); setNewOrder({}) }}>
          <DialogTitle>{editingId ? "Siparişi Güncelle" : "Yeni Sipariş"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              {columns.map((col) => (
                <TextField
                  key={col}
                  name={col}
                  label={col.replaceAll("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                  value={newOrder[col] || ""}
                  onChange={handleInputChange}
                  type={
                    col === "yapilacak_tarih"
                      ? "datetime-local"
                      : col === "fiyat"
                      ? "number"
                      : "text"
                  }
                  InputLabelProps={{ shrink: true }}
                  multiline={col === "notlar"}
                  rows={col === "notlar" ? 2 : undefined}
                  required={col !== "notlar"}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
              ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setShowForm(false); setEditingId(null); setNewOrder({}) }}>İptal</Button>
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
      >
        <DialogTitle>📝 Notları Düzenle</DialogTitle>
        <DialogContent>
            <TextField
                autoFocus
                margin="dense"
                id="note-content"
                label="Not İçeriği"
                type="text"
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
            />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialogOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleNoteSave}>Kaydet</Button>
        </DialogActions>
      </Dialog>

        <TableContainer component={Paper}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow sx={{"& th": {backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold'}}}>
                <TableCell>Saat</TableCell>
                <TableCell>Yapılacak Tarih</TableCell>
                {columns
                  .filter((col) => !["id", "yapilacak_tarih", "verildigi_tarih", "notlar"].includes(col))
                  .map((col) => {
                    const headers = {
                      siparis: "Sipariş",
                      musteri_isim: "Müşteri İsmi",
                      musteri_telefon: "Müşteri Telefonu",
                      ekip: "Ekip",
                      adres: "Adres",
                      fiyat: "Fiyat",
                    };
                    return (<TableCell key={col}>{headers[col] || col.replaceAll("_"," ").replace(/\b\w/g, l => l.toUpperCase())}</TableCell>);
                  })}
                <TableCell>İşlem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrders.map((order) => {
                const dateObj = order.yapilacak_tarih ? new Date(order.yapilacak_tarih) : null;
                const saat = dateObj ? dateObj.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false, }) : "N/A";
                const tarih = dateObj ? dateObj.toLocaleDateString("tr-TR") : "N/A";
                return (
                  <TableRow key={order.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>{saat}</TableCell>
                    <TableCell>{tarih}</TableCell>
                    {columns
                      .filter((col) => !["id", "yapilacak_tarih", "verildigi_tarih", "notlar"].includes(col))
                      .map((col) => (
                        <TableCell key={col}>
                          {col === 'fiyat' && typeof order[col] === 'number'
                            ? `${order[col].toLocaleString('tr-TR')} ₺`
                            : order[col] || '-'}
                         </TableCell>
                      ))}
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Düzenle">
                              <IconButton size="small" onClick={() => handleEdit(order)}><EditIcon fontSize="small"/></IconButton>
                          </Tooltip>
                          <Tooltip title="Sil">
                              <IconButton size="small" color="error" onClick={() => handleDelete(order.id)}><DeleteIcon fontSize="small"/></IconButton>
                          </Tooltip>
                          <Tooltip title="Notları Gör/Düzenle">
                              <IconButton
                                size="small"
                                onClick={() => handleEditNote(order)}
                              >
                                📝
                              </IconButton>
                          </Tooltip>
                      </Stack>
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

