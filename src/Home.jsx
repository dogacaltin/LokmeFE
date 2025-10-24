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
  CircularProgress,
  Tooltip,
  Badge, // Not göstergesi için eklendi
  DialogContentText // Silme onayı için eklendi
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
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications'; // Not göstergesi ikonu
import PhoneIcon from '@mui/icons-material/Phone';
import * as XLSX from 'xlsx';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { format, startOfDay } from 'date-fns'; // format ve startOfDay eklenmeli

// --- YENİ: Sabit Form Alanları ---
// Yeni Sipariş ve Düzenleme formunda gösterilecek alan adları
const ORDER_FORM_FIELDS = [
    "siparis",
    "yapilacak_tarih",
    "musteri_isim",
    "musteri_telefon",
    "ekip",
    "adres",
    "fiyat",
    "notlar"
];
// --- EKLENEN BÖLÜM SONU ---

// İsteğe bağlı: Tabloda kullanılacak sütunlar (tarih ve notlar hariç)
const TABLE_COLUMNS = [
    "siparis",
    "musteri_isim",
    "musteri_telefon",
    "ekip",
    "adres",
    "fiyat",
];


export default function Home() {
  const API_URL = process.env.REACT_APP_API_URL;
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
  const [columns, setColumns] = useState([]);
  const [noteOrderId, setNoteOrderId] = useState(null);
  const [selectedNoteOrder, setSelectedNoteOrder] = useState(null);
  const [loading, setLoading] = useState(true);
    // --- YENİ: Telefon Notları Dialog State'leri ---
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phoneContent, setPhoneContent] = useState("");
  const [phoneOrderId, setPhoneOrderId] = useState(null); // Hangi sipariş için olduğunu bilmek için
  // --- EKLENEN BÖLÜM SONU ---
  // --- YENİ: Silme onayı için state'ler ---
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  // --- EKLENEN BÖLÜM SONU ---


  const handleUnauthorized = async (error, context = "Unknown") => {
    console.error(`Authorization Error Handler Triggered from [${context}]:`, error);

    let status = null;
    let errorDetail = "Bilinmeyen Hata";
    let responseBody = null;

    if (error instanceof Response) {
        status = error.status;
        try {
            responseBody = await error.clone().json();
            errorDetail = responseBody.detail || error.statusText;
            console.error(`API Response Error: Status ${status}, Detail: ${errorDetail}`, "Response Body:", responseBody);
        } catch (jsonError) {
             try {
                 responseBody = await error.text();
                 errorDetail = error.statusText;
                 console.error(`API Response Error: Status ${status}, Body is not JSON. Body Text:`, responseBody);
             } catch (textError) {
                 errorDetail = error.statusText;
                 console.error(`API Response Error: Status ${status}, Could not parse response body.`);
             }
        }
    } else if (error.response) {
        status = error.response.status;
        responseBody = error.response.data;
        errorDetail = error.response.data?.detail || error.message;
        console.error(`Library Error Response: Status ${status}, Detail: ${errorDetail}`, "Response Data:", responseBody);
    }
     else {
        errorDetail = error.message || "Ağ hatası veya beklenmedik bir sorun.";
        console.error("Non-HTTP Error:", errorDetail, error);
    }

    if (status === 401) {
        console.warn("Unauthorized (401) confirmed, logging out. Token might be expired or invalid.");
        localStorage.removeItem("authToken");
        localStorage.removeItem("authTokenTimestamp"); // Zaman damgasını da sil
        setTimeout(() => navigate("/"), 50);
    } else {
         console.log(`Error status ${status || 'N/A'} encountered in context [${context}], not logging out.`);
         // Kullanıcıya genel bir hata mesajı gösterilebilir
         // Örneğin: alert(`Bir hata oluştu: ${errorDetail}`);
    }
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const token = localStorage.getItem("authToken");
    const tokenTimestamp = localStorage.getItem("authTokenTimestamp");
    const now = Date.now();
    let isTokenPotentiallyExpired = false;

    if (tokenTimestamp) {
        const tokenAgeMinutes = (now - parseInt(tokenTimestamp, 10)) / (1000 * 60);
        console.log(`useEffect: Token age is approx ${tokenAgeMinutes.toFixed(1)} minutes.`);
        if (tokenAgeMinutes > 58) {
             console.warn("useEffect: Token is older than 58 minutes, potentially expired.");
             isTokenPotentiallyExpired = true;
        }
    }

    console.log("useEffect: Checking token...", token ? `Token found (potentially expired: ${isTokenPotentiallyExpired})` : "No token found");

    if (!token) {
      console.log("useEffect: No token, navigating to login.");
      navigate("/");
      return;
    }

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    console.log("useEffect: Preparing to fetch data with token.");

    const fetchOrders = async () => { // Sadece fetchOrders kaldı
      try {
        console.log("useEffect: Fetching orders...");
        const ordersRes = await fetch(`${API_URL}/orders`, authHeaders);
        console.log("useEffect: Orders response received. Status:", ordersRes.status);

        if (isMounted) {
            if (!ordersRes.ok) {
                console.error("useEffect: Orders fetch failed!");
                throw ordersRes;
            }
            const orderData = await ordersRes.json();
            console.log("useEffect: Orders data received, processing...");
            const sortedOrders = orderData
              .filter(order => order.yapilacak_tarih)
              .sort((a, b) => new Date(a.yapilacak_tarih) - new Date(b.yapilacak_tarih));
            setOrders(sortedOrders);
            console.log("useEffect: State updated successfully.");
        }
        // '/orders/columns' ile ilgili kodlar buradan silindi.
      } catch (err) {
         console.error("useEffect: Error during fetchOrders:", err);
         if (isMounted) { handleUnauthorized(err, "useEffect fetchOrders"); }
      } finally {
         if (isMounted) { console.log("useEffect: Setting loading to false."); setLoading(false); }
      }
    };

    fetchOrders();

    return () => {
        console.log("useEffect: Cleanup function called, component unmounting.");
        isMounted = false;
    };

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
      handleUnauthorized(err, "handleNoteSave");
    }
  };

    const handleEditPhone = (order) => {
    setPhoneContent(order.ekstra_telefon || ""); // Backend'den gelen 'ekstra_telefon' alanını kullan
    setPhoneOrderId(order.id);
    setPhoneDialogOpen(true);
  };


  const handlePhoneSave = async () => {
    const token = localStorage.getItem("authToken");
    if (!phoneOrderId) return;
    try {
      // Backend'e sadece 'ekstra_telefon' alanını gönder
      const payload = { ekstra_telefon: phoneContent };
      const response = await fetch(`${API_URL}/orders/${phoneOrderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
       if (!response.ok) throw response;
      // Lokal state'i güncelle
      setOrders(prevOrders => prevOrders.map(o => o.id === phoneOrderId ? { ...o, ekstra_telefon: phoneContent } : o));
      setPhoneDialogOpen(false); setPhoneContent(""); setPhoneOrderId(null);
    } catch (err) { handleUnauthorized(err, "handlePhoneSave"); }
  };

const handleFormSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("authToken");
    const url = editingId
      ? `${API_URL}/orders/${editingId}`
      : `${API_URL}/orders`;
    const method = editingId ? "PUT" : "POST";
    console.log(`handleFormSubmit: Submitting form. Method: ${method}, URL: ${url}`);
    const orderPayload = { ...newOrder };

    // Tarihi ISO formatına çevir ve kontrol et
    if (orderPayload.yapilacak_tarih && typeof orderPayload.yapilacak_tarih === 'string') {
        try {
            const date = new Date(orderPayload.yapilacak_tarih);
            if (isNaN(date.getTime())) throw new Error("Invalid Date object");
            orderPayload.yapilacak_tarih = date.toISOString();
            console.log("handleFormSubmit: Date converted to ISO:", orderPayload.yapilacak_tarih);
         }
        catch (dateErr) { console.error("Invalid date format entered:", orderPayload.yapilacak_tarih, dateErr); alert("Lütfen geçerli bir tarih ve saat girin."); return; }
    } else if (!orderPayload.yapilacak_tarih && method === 'POST') { console.error("Yapılacak tarih needed for new order."); alert("Yeni sipariş için 'Yapılacak Tarih' zorunludur."); return; }

    // Fiyatı sayıya çevir ve kontrol et
     if (orderPayload.fiyat && typeof orderPayload.fiyat === 'string') {
        const price = parseFloat(orderPayload.fiyat);
        if (isNaN(price)) { console.error("Invalid price format:", orderPayload.fiyat); alert("Lütfen geçerli bir fiyat girin."); return; }
        orderPayload.fiyat = price;
    } else if (orderPayload.fiyat === '') {
        // Fiyat alanı boş bırakıldıysa veya silindiyse null gönderilebilir (backend'e bağlı)
        orderPayload.fiyat = null; // veya 0, backend'in beklentisine göre
    }


    try {
      console.log("handleFormSubmit: Sending payload:", orderPayload);
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(orderPayload) });
      console.log(`handleFormSubmit: API response status: ${response.status}`);
      if (!response.ok) throw response;
      const savedOrder = await response.json(); // API'den dönen güncel/yeni veriyi al
      console.log("handleFormSubmit: Order saved/updated successfully:", savedOrder);

      setShowForm(false);
      setEditingId(null);
      setNewOrder({}); // Formu temizle

      // --- YENİ: State'i Yerel Olarak Güncelle ve Sırala ---
      setOrders(prevOrders => {
                let updatedList;
                if (editingId) {
                    // Düzenleme: Eski siparişi bul ve yenisiyle değiştir
                    updatedList = prevOrders.map(o => o.id === editingId ? savedOrder : o);
                } else {
                    // Yeni Ekleme: Yeni siparişi listeye ekle
                    updatedList = [...prevOrders, savedOrder];
                }
                // Hem ekleme hem de düzenleme sonrası listeyi filtrele (isteğe bağlı ama iyi pratik) ve sırala
                console.log("handleFormSubmit: Re-sorting list after update/add.");
                return updatedList
                    .filter(order => order.yapilacak_tarih) // Tarihi olmayanları çıkar (güvenlik için)
                    .sort((a, b) => new Date(a.yapilacak_tarih) - new Date(b.yapilacak_tarih)); // Tarihe göre sırala
            });
      // --- GÜNCELLEME SONU ---

    } catch (err) { console.error(`handleFormSubmit Error (${method}):`, err); handleUnauthorized(err, "handleFormSubmit"); }
  };

  // --- GÜNCELLENDİ: handleDelete ---
  // Artık direkt silmek yerine onay dialog'unu açacak
  const handleDelete = (id) => {
    setDeletingOrderId(id); // Silinecek ID'yi state'e kaydet
    setDeleteConfirmOpen(true); // Onay dialog'unu aç
  };
  // --- GÜNCELLEME SONU ---

  // --- YENİ: confirmDelete fonksiyonu ---
  // Kullanıcı silmeyi onayladığında bu fonksiyon çalışacak
  const confirmDelete = async () => {
    const token = localStorage.getItem("authToken");
    if (!deletingOrderId) return; // Silinecek ID yoksa çık

    try {
      const response = await fetch(`${API_URL}/orders/${deletingOrderId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
      });
       if (!response.ok) throw response;
      // State'ten sil
      setOrders(prevOrders => prevOrders.filter(order => order.id !== deletingOrderId));
      setDeleteConfirmOpen(false); // Dialog'u kapat
      setDeletingOrderId(null); // ID'yi temizle
    } catch (err) {
      console.error("Silme hatası:", err);
      handleUnauthorized(err, "confirmDelete"); // Hata yönetimi
      setDeleteConfirmOpen(false); // Hata olsa bile dialog'u kapat
      setDeletingOrderId(null);
    }
  };
  // --- EKLENEN BÖLÜM SONU ---


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
    console.log("handleLogout called.");
    localStorage.removeItem("authToken");
    localStorage.removeItem("authTokenTimestamp");
    navigate("/");
  };

  // --- YENİ: Excel Dışa Aktarma Fonksiyonu ---
  const exportToExcel = (dataToExport, filename = "siparisler.xlsx") => {
    console.log("exportToExcel: Starting export...");
    if (!dataToExport || dataToExport.length === 0) {
        alert("Dışa aktarılacak sipariş bulunamadı."); return;
    }
    const todayStart = startOfDay(new Date()); // Bugünün başlangıcı
    const filteredData = dataToExport.filter(order => {
        if (!order.yapilacak_tarih) return false;
        try { return new Date(order.yapilacak_tarih) >= todayStart; }
        catch (e) { return false; }
    });
    if (filteredData.length === 0) {
        alert("Bugün ve sonrası için dışa aktarılacak sipariş bulunamadı."); return;
    }
    const formattedData = filteredData.map(order => ({ // Başlıkları ve formatı ayarla
        'ID': order.id,
        'Sipariş': order.siparis,
        'Yapılacak Tarih': order.yapilacak_tarih ? format(new Date(order.yapilacak_tarih), 'dd.MM.yyyy HH:mm', { locale: tr }) : '',
        'Müşteri İsmi': order.musteri_isim,
        'Müşteri Telefonu': order.musteri_telefon,
        'Ekip': order.ekip,
        'Adres': order.adres,
        'Fiyat (₺)': order.fiyat,
        'Notlar': order.notlar,
        'Ekstra Telefon': order.ekstra_telefon,
        'Verildiği Tarih': order.verildigi_tarih ? format(new Date(order.verildigi_tarih), 'dd.MM.yyyy HH:mm', { locale: tr }) : '',
    }));
    try {
        const ws = XLSX.utils.json_to_sheet(formattedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Siparişler");
        const exportFilename = `siparisler_bugun_ve_sonrasi_${format(new Date(), 'yyyyMMdd')}.xlsx`;
        XLSX.writeFile(wb, exportFilename);
        console.log("exportToExcel: File download initiated.");
    } catch (excelError) { console.error("Excel Error:", excelError); alert("Excel dosyası oluşturulamadı."); }
  };
  // --- FONKSİYON SONU ---

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
            <Button variant="contained" color="primary" onClick={() => navigate("/planner")}>
              Takvim
            </Button>
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

        {/* Arama, Tarih Filtresi ve Yeni Sipariş Butonu */}
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
                ORDER_FORM_FIELDS.forEach((col) => { formInit[col] = ""; });
                setNewOrder(formInit);
                setEditingId(null);
                setShowForm(true);
            }}
            size="medium"
          >
            YENİ SİPARİŞ
          </Button>
        </Stack>

        {/* Filtre Butonları */}
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
          <Tooltip title="Bugünün ve Gelecekteki Siparişleri Excel'e Aktar">
         <Button
            size="small"
            variant="contained"
            color="secondary" // Farklı bir renk
            startIcon={<FileDownloadIcon />}
            onClick={() => exportToExcel(orders)} // Tüm 'orders' state'ini gönder
            disabled={loading || orders.length === 0} // Veri yoksa pasif
            sx={{ ml: 'auto' }} // Sağa yasla
         >
            Excel'e Aktar (Bugün+)
         </Button>
      </Tooltip>
        </Stack>

       {/* Yeni/Düzenle Sipariş Formu (Dialog) */}
        <Dialog open={showForm} onClose={() => { setShowForm(false); setEditingId(null); setNewOrder({}) }}>
          <DialogTitle>{editingId ? "Siparişi Güncelle" : "Yeni Sipariş"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              {ORDER_FORM_FIELDS.map((col) => (
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

      {/* Not Düzenleme Formu (Dialog) */}
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

    {/* --- YENİ: Telefon Notları Düzenleme Formu (Dialog) --- */}
    <Dialog open={phoneDialogOpen} onClose={() => setPhoneDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>📞 Ekstra Telefon Numaraları</DialogTitle>
      <DialogContent>
          <TextField
              autoFocus
              margin="dense"
              id="phone-content"
              label="Telefon Numaraları"
              placeholder="Numaraları virgülle ayırarak yazınız..."
              type="text" // Telefon için özel input type'ları da kullanılabilir
              fullWidth
              multiline
              rows={4} // İhtiyaca göre ayarlanabilir
              variant="outlined"
              value={phoneContent}
              onChange={(e) => setPhoneContent(e.target.value)}
          />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setPhoneDialogOpen(false)}>İptal</Button>
        <Button variant="contained" onClick={handlePhoneSave}>Kaydet</Button>
      </DialogActions>
    </Dialog>

      {/* --- YENİ: Silme Onay Dialog'u --- */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Silme Onayı"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Bu siparişi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>İptal</Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            Sil
          </Button>
        </DialogActions>
      </Dialog>
      {/* --- EKLENEN BÖLÜM SONU --- */}


        {/* Sipariş Tablosu */}
        <TableContainer component={Paper}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow sx={{"& th": {backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold'}}}>
                <TableCell>Saat</TableCell>
                <TableCell>Yapılacak Tarih</TableCell>
                {ORDER_FORM_FIELDS
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
                // --- YENİ: Not var mı kontrolü ---
                const hasNotes = order.notlar && order.notlar.trim().length > 0;
                // --- EKLENEN BÖLÜM SONU ---

                // --- YENİ: Ekstra telefon notları var mı kontrolü ---
                const hasPhoneNotes = order.ekstra_telefon && order.ekstra_telefon.trim().length > 0;
                // --- EKLENEN BÖLÜM SONU ---
                return (
                  <TableRow key={order.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>{saat}</TableCell>
                    <TableCell>{tarih}</TableCell>
                    {ORDER_FORM_FIELDS
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
                              {/* --- GÜNCELLENDİ: handleDelete çağrısı --- */}
                              <IconButton size="small" color="error" onClick={() => handleDelete(order.id)}><DeleteIcon fontSize="small"/></IconButton>
                          </Tooltip>
                          <Tooltip title={hasNotes ? "Notları Gör/Düzenle (İçerik Var)" : "Notları Gör/Düzenle"}>
                              {/* --- YENİ: Not göstergesi için Badge --- */}
                              <Badge
                                  color="warning" // Uyarı rengi (sarı)
                                  variant="dot" // Küçük nokta şeklinde
                                  invisible={!hasNotes} // Not yoksa görünmez yap
                                  overlap="circular"
                              >
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditNote(order)}
                                  >
                                    📝 {/* Emoji veya başka bir ikon olabilir */}
                                  </IconButton>
                              </Badge>
                              {/* --- EKLENEN BÖLÜM SONU --- */}

                                                    {/* --- YENİ: Telefon Notları Butonu --- */}
                          <Tooltip title={hasPhoneNotes ? "Ekstra Telefonları Gör/Düzenle (İçerik Var)" : "Ekstra Telefonları Gör/Düzenle"}>
                              <Badge color="info" variant="dot" invisible={!hasPhoneNotes} overlap="circular">
                                  <IconButton size="small" onClick={() => handleEditPhone(order)}><PhoneIcon fontSize="small"/></IconButton>
                              </Badge>
                          </Tooltip>
                          {/* --- EKLENEN BÖLÜM SONU --- */}
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

