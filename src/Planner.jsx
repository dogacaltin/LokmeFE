import React, { useEffect, useMemo, useState } from "react"; // useMemo eklendi
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  Grid,
  Button,
  useTheme,
  IconButton, // IconButton eklendi
  Tooltip // Tooltip eklendi
} from "@mui/material";
import LogoutIcon from '@mui/icons-material/Logout';
import ThemeToggle from "./components/ThemeToggle";
import { format, isSameDay, parseISO, startOfDay } from 'date-fns'; // isSameDay, startOfDay eklendi
import { tr } from 'date-fns/locale';
import BarChartIcon from "@mui/icons-material/BarChart";
import ReceiptIcon from "@mui/icons-material/Receipt";
// YENİ: Tarih seçici için importlar
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
// YENİ: Önceki/Sonraki gün ikonları
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import TodayIcon from '@mui/icons-material/Today';
import { addDays, subDays } from 'date-fns'; // Gün ekleme/çıkarma için

// Sipariş Kartı Component'i (değişiklik yok)
const OrderCard = ({ order, theme }) => {
  const dateObj = order.yapilacak_tarih ? parseISO(order.yapilacak_tarih) : null;
  const saat = dateObj ? format(dateObj, 'HH:mm', { locale: tr }) : 'N/A';
  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2, backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#f9f9f9', borderLeft: `5px solid ${theme.palette.primary.main}`, borderRadius: '8px' }}>
      <Typography variant="subtitle1" fontWeight="bold">{saat} - {order.siparis || 'Bilinmeyen Sipariş'}</Typography>
      <Typography variant="body2">Müşteri: {order.musteri_isim || '-'}</Typography>
      <Typography variant="body2">Telefon: {order.musteri_telefon || '-'}</Typography>
      {order.ekstra_telefon && (<Typography variant="body2" sx={{ color: theme.palette.info.main }}>Ekstra Tel: {order.ekstra_telefon}</Typography>)}
      <Typography variant="body2">Adres: {order.adres || '-'}</Typography>
      <Typography variant="body2">Fiyat: {order.fiyat ? `${order.fiyat.toLocaleString('tr-TR')} ₺` : '-'}</Typography>
      {order.notlar && (<Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: theme.palette.warning.dark }}>Not: {order.notlar}</Typography>)}
    </Paper>
  );
};

export default function Planner() {
  const API_URL = process.env.REACT_APP_API_URL || "";
  const navigate = useNavigate();
  const theme = useTheme();
  const [allOrders, setAllOrders] = useState([]); // TÜM siparişleri tutacak state
  const [loading, setLoading] = useState(true);
  // YENİ: Seçili tarihi tutacak state, başlangıçta bugünün tarihi
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date())); // Sadece gün bilgisi önemli

  // Yetkisiz istekleri yakalayan fonksiyon (aynı kalıyor)
  const handleUnauthorized = async (error, context = "Unknown") => {
     console.error(`Authorization Error Handler Triggered from [${context}]:`, error);
    let status = null; let errorDetail = "Bilinmeyen Hata";
    if (error instanceof Response) { status = error.status; try { const rb = await error.clone().json(); errorDetail = rb.detail || error.statusText; console.error(`API Response Error: Status ${status}, Detail: ${errorDetail}`, "Response Body:", rb); } catch (e) { try { const rt = await error.text(); errorDetail = rt || error.statusText; console.error(`API Response Error: Status ${status}, Body is not JSON. Body Text:`, rt); } catch (e2) { errorDetail = error.statusText; console.error(`API Response Error: Status ${status}, Could not parse response body.`);} } }
    else if (error.response) { status = error.response.status; errorDetail = error.response.data?.detail || error.message; console.error(`Library Error Response: Status ${status}, Detail: ${errorDetail}`, "Response Data:", error.response.data); }
    else { errorDetail = error.message || "Ağ hatası."; console.error("Non-HTTP Error:", errorDetail, error); }
    if (status === 401) { console.warn("Unauthorized (401), logging out."); localStorage.removeItem("authToken"); localStorage.removeItem("authTokenTimestamp"); setTimeout(() => navigate("/"), 50); }
    else { console.log(`Error status ${status || 'N/A'} in context [${context}], not logging out.`); }
  };

  // Veri çekme efekti: Artık TÜM siparişleri çeker
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const token = localStorage.getItem("authToken");
    if (!token) { navigate("/"); return; }
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    const fetchAllOrders = async () => {
      try {
        const ordersRes = await fetch(`${API_URL}/orders`, authHeaders);
        if (isMounted) {
          if (!ordersRes.ok) throw ordersRes;
          const orderData = await ordersRes.json();
          // Tüm siparişleri state'e kaydet (filtrelenmemiş)
          setAllOrders(orderData);
        }
      } catch (err) {
        if (isMounted) { handleUnauthorized(err, "Planner fetchAllOrders"); }
      } finally {
        if (isMounted) { setLoading(false); }
      }
    };
    fetchAllOrders();
    return () => { isMounted = false; };
  }, [API_URL, navigate]);

  // YENİ: Seçili tarihe göre filtreleme ve gruplama (useMemo ile optimize edildi)
  const { groupedOrders, teams } = useMemo(() => {
    if (loading || !selectedDate) {
      return { groupedOrders: {}, teams: [] }; // Yükleniyorsa veya tarih seçilmemişse boş döndür
    }

    // 1. Seçili güne ait siparişleri filtrele
    const selectedDayOrders = allOrders.filter(order =>
      order.yapilacak_tarih && isSameDay(parseISO(order.yapilacak_tarih), selectedDate)
    );

    // 2. Ekiplere göre grupla
    const groups = selectedDayOrders.reduce((acc, order) => {
      const team = order.ekip || "Ekip Belirtilmemiş";
      if (!acc[team]) {
        acc[team] = [];
      }
      acc[team].push(order);
      // Grubu saate göre sırala
      acc[team].sort((a, b) => new Date(a.yapilacak_tarih) - new Date(b.yapilacak_tarih));
      return acc;
    }, {});

    const teamNames = Object.keys(groups).sort(); // Ekipleri sırala

    return { groupedOrders: groups, teams: teamNames };
  }, [allOrders, selectedDate, loading]); // allOrders veya selectedDate değiştiğinde tekrar hesapla

  // Çıkış yapma fonksiyonu (aynı kalıyor)
  const handleLogout = () => { /* ... */ };

  // Yükleniyor durumu (aynı kalıyor)
  if (loading) { /* ... */ }

  // Seçili tarihi formatla
  const selectedDateFormatted = selectedDate ? format(selectedDate, 'dd MMMM yyyy, EEEE', { locale: tr }) : 'Tarih Seçilmedi';

  // --- YENİ: Tarih değiştirme fonksiyonları ---
  const handleDateChange = (newDate) => {
    // Sadece gün bilgisini al, saat bilgisini sıfırla
    setSelectedDate(newDate ? startOfDay(newDate) : null);
  };

  const goToPreviousDay = () => {
      setSelectedDate(prevDate => prevDate ? subDays(prevDate, 1) : null);
  };

  const goToNextDay = () => {
       setSelectedDate(prevDate => prevDate ? addDays(prevDate, 1) : null);
  };

   const goToToday = () => {
       setSelectedDate(startOfDay(new Date()));
  };
  // --- Fonksiyonlar Sonu ---

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: "100vh", backgroundColor: theme.palette.background.default }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems="center" mb={3} spacing={2}>
        {/* Başlık ve Tarih Seçici */}
        <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h4" component="h1">🗓️ Plan -</Typography>
            {/* YENİ: Tarih Seçici */}
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                <DatePicker
                    label="Tarih Seç"
                    value={selectedDate}
                    onChange={handleDateChange} // Seçilen tarihi state'e yazar
                    slotProps={{ textField: { size: 'small' } }}
                    format="dd/MM/yyyy" // Formatı ayarla
                />
                 {/* YENİ: Önceki/Sonraki Gün Butonları */}
                 <Tooltip title="Önceki Gün">
                     <IconButton onClick={goToPreviousDay} size="small">
                         <ArrowBackIosNewIcon fontSize="inherit"/>
                     </IconButton>
                 </Tooltip>
                 <Tooltip title="Bugün">
                     <IconButton onClick={goToToday} size="small" color="primary">
                         <TodayIcon fontSize="inherit"/>
                     </IconButton>
                 </Tooltip>
                 <Tooltip title="Sonraki Gün">
                     <IconButton onClick={goToNextDay} size="small">
                         <ArrowForwardIosIcon fontSize="inherit"/>
                     </IconButton>
                 </Tooltip>
            </LocalizationProvider>
        </Stack>
        {/* Header Butonları */}
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <ThemeToggle />
           {/* Butonları istediğin gibi sıralayabilirsin */}
          <Button size="small" variant="contained" startIcon={<BarChartIcon />} onClick={() => navigate("/dashboard")}>Dashboard</Button>
          <Button size="small" variant="contained" color="primary" onClick={() => navigate("/giderler")}>Giderler</Button>
          <Button size="small" variant="contained" color="primary" startIcon={<ReceiptIcon />} onClick={() => navigate("/home")}>Siparişler</Button>
          <Button size="small" variant="contained" color="error" startIcon={<LogoutIcon />} onClick={handleLogout}>Çıkış Yap</Button>
        </Stack>
      </Stack>

        {/* Başlıkta Seçili Tarihi Göster */}
       <Typography variant="h5" component="h2" sx={{ mb: 3, textAlign: 'center' }}>
            {selectedDateFormatted}
       </Typography>

      {/* Ekip Sütunları */}
      {teams.length === 0 && !loading ? (
           <Typography sx={{mt: 4, textAlign: 'center'}}>Seçili gün için planlanmış sipariş bulunmamaktadır.</Typography> // Mesaj güncellendi
       ) : (
      <Grid container spacing={3}>
        {teams.map((teamName) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={teamName}>
            <Typography variant="h6" align="center" sx={{ mb: 2, p: 1, backgroundColor: theme.palette.primary.light, color: theme.palette.primary.contrastText, borderRadius: '4px' }}>
                {teamName} ({groupedOrders[teamName]?.length || 0})
            </Typography>
            <Box sx={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', pr: 1 }}> {/* Yüksekliği ayarla */}
                {groupedOrders[teamName]?.map((order) => (
                  <OrderCard key={order.id} order={order} theme={theme} />
                ))}
            </Box>
          </Grid>
        ))}
      </Grid>
       )}
    </Box>
  );
}

