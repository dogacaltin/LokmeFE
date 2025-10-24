import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  Grid, // Grid layout için
  Button, // Çıkış butonu için
  useTheme
} from "@mui/material";
import LogoutIcon from '@mui/icons-material/Logout';
import ThemeToggle from "./components/ThemeToggle"; // ThemeToggle'ı import etmeyi unutmayın
import { format, isToday, parseISO } from 'date-fns'; // Tarih işlemleri için
import { tr } from 'date-fns/locale'; // Türkçe tarih formatı için
// YENİ: İkonlar eklendi
import BarChartIcon from "@mui/icons-material/BarChart";
import ReceiptIcon from "@mui/icons-material/Receipt"; // Siparişler için
import EventIcon from '@mui/icons-material/Event'; // Takvim/Planner için

// Sipariş kartı için ayrı bir component oluşturmak daha temiz olabilir,
// ama şimdilik doğrudan burada tanımlayalım.
const OrderCard = ({ order, theme }) => {
  const dateObj = order.yapilacak_tarih ? parseISO(order.yapilacak_tarih) : null;
  const saat = dateObj ? format(dateObj, 'HH:mm', { locale: tr }) : 'N/A';

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        mb: 2, // Kartlar arası boşluk
        backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#f9f9f9',
        borderLeft: `5px solid ${theme.palette.primary.main}`, // Sol kenarda renkli çizgi
        borderRadius: '8px'
      }}
    >
      <Typography variant="subtitle1" fontWeight="bold">
        {saat} - {order.siparis || 'Bilinmeyen Sipariş'}
      </Typography>
      <Typography variant="body2">Müşteri: {order.musteri_isim || '-'}</Typography>
      <Typography variant="body2">Telefon: {order.musteri_telefon || '-'}</Typography>
      {order.ekstra_telefon && (
        <Typography variant="body2" sx={{ color: theme.palette.info.main }}>
          Ekstra Tel: {order.ekstra_telefon}
        </Typography>
      )}
      <Typography variant="body2">Adres: {order.adres || '-'}</Typography>
      <Typography variant="body2">Fiyat: {order.fiyat ? `${order.fiyat.toLocaleString('tr-TR')} ₺` : '-'}</Typography>
      {order.notlar && (
         <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: theme.palette.warning.dark }}>
           Not: {order.notlar}
         </Typography>
      )}
       {/* Gerekirse diğer alanları da buraya ekleyebilirsiniz */}
    </Paper>
  );
};


export default function Planner() {
  const API_URL = process.env.REACT_APP_API_URL || "";
  const navigate = useNavigate();
  const theme = useTheme();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupedOrders, setGroupedOrders] = useState({}); // Ekiplere göre gruplanmış siparişler
  const [teams, setTeams] = useState([]); // Ekiplerin listesi

  // Yetkisiz istekleri yakalayan fonksiyon (Home.js'ten kopyalandı)
  const handleUnauthorized = async (error, context = "Unknown") => {
     console.error(`Authorization Error Handler Triggered from [${context}]:`, error);
    let status = null; let errorDetail = "Bilinmeyen Hata";
    if (error instanceof Response) { status = error.status; try { const rb = await error.clone().json(); errorDetail = rb.detail || error.statusText; console.error(`API Response Error: Status ${status}, Detail: ${errorDetail}`, "Response Body:", rb); } catch (e) { try { const rt = await error.text(); errorDetail = rt || error.statusText; console.error(`API Response Error: Status ${status}, Body is not JSON. Body Text:`, rt); } catch (e2) { errorDetail = error.statusText; console.error(`API Response Error: Status ${status}, Could not parse response body.`);} } }
    else if (error.response) { status = error.response.status; errorDetail = error.response.data?.detail || error.message; console.error(`Library Error Response: Status ${status}, Detail: ${errorDetail}`, "Response Data:", error.response.data); }
    else { errorDetail = error.message || "Ağ hatası."; console.error("Non-HTTP Error:", errorDetail, error); }
    if (status === 401) { console.warn("Unauthorized (401), logging out."); localStorage.removeItem("authToken"); localStorage.removeItem("authTokenTimestamp"); setTimeout(() => navigate("/"), 50); }
    else { console.log(`Error status ${status || 'N/A'} in context [${context}], not logging out.`); /* Hata mesajı gösterilebilir */ }
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const token = localStorage.getItem("authToken");
    if (!token) { navigate("/"); return; }
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    const fetchOrdersAndGroup = async () => {
      try {
        const ordersRes = await fetch(`${API_URL}/orders`, authHeaders);
        if (isMounted) {
          if (!ordersRes.ok) throw ordersRes;
          const orderData = await ordersRes.json();

          // 1. Bugüne ait siparişleri filtrele
          const today = new Date();
          const todaysOrders = orderData.filter(order =>
            order.yapilacak_tarih && isToday(parseISO(order.yapilacak_tarih))
          );

          // 2. Ekiplere göre grupla
          const groups = todaysOrders.reduce((acc, order) => {
            const team = order.ekip || "Ekip Belirtilmemiş"; // Ekip yoksa varsayılan grup
            if (!acc[team]) {
              acc[team] = [];
            }
            // Saate göre sıralayarak ekle
             acc[team].push(order);
             acc[team].sort((a, b) => new Date(a.yapilacak_tarih) - new Date(b.yapilacak_tarih));
            return acc;
          }, {});

          setGroupedOrders(groups);
          // Ekiplerin isimlerini al ve sırala (örneğin alfabetik)
          setTeams(Object.keys(groups).sort());
          setOrders(todaysOrders); // İsterseniz bugünün tüm siparişlerini ayrı bir state'te tutabilirsiniz
        }
      } catch (err) {
        if (isMounted) { handleUnauthorized(err, "Planner fetchOrders"); }
      } finally {
        if (isMounted) { setLoading(false); }
      }
    };
    fetchOrdersAndGroup();
    return () => { isMounted = false; };
  }, [API_URL, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authTokenTimestamp");
    navigate("/");
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Plan yükleniyor...</Typography>
      </Box>
    );
  }

  const todayFormatted = format(new Date(), 'dd MMMM yyyy, EEEE', { locale: tr });

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: "100vh", backgroundColor: theme.palette.background.default }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={3} spacing={2}>
        <Typography variant="h4" component="h1">🗓️ Günün Planı - {todayFormatted}</Typography>
        {/* --- GÜNCELLENDİ: Header Butonları --- */}
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <ThemeToggle />
           <Button size="small" variant="contained" color="secondary" startIcon={<EventIcon />} onClick={() => navigate("/planner")}>
            Takvim
          </Button>
          <Button size="small" variant="contained" startIcon={<BarChartIcon />} onClick={() => navigate("/dashboard")}>
            Dashboard
          </Button>
          <Button size="small" variant="contained" color="primary" onClick={() => navigate("/giderler")}>
            Giderler
          </Button>
           <Button size="small" variant="contained" color="primary" startIcon={<ReceiptIcon />} onClick={() => navigate("/home")}>
            Siparişler
          </Button>
          <Button size="small" variant="contained" color="error" startIcon={<LogoutIcon />} onClick={handleLogout}>
            Çıkış Yap
          </Button>
        </Stack>
        {/* --- GÜNCELLEME SONU --- */}
      </Stack>

      {/* Ekip Sütunları */}
      {teams.length === 0 && !loading ? (
           <Typography sx={{mt: 4, textAlign: 'center'}}>Bugün için planlanmış sipariş bulunmamaktadır.</Typography>
       ) : (
      <Grid container spacing={3}>
        {teams.map((teamName) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={teamName}> {/* Responsive sütun genişlikleri */}
            <Typography
                variant="h6"
                align="center"
                sx={{
                    mb: 2,
                    p: 1,
                    backgroundColor: theme.palette.primary.light, // Hafif arkaplan
                    color: theme.palette.primary.contrastText, // Kontrast renk
                    borderRadius: '4px'
                 }}
            >
                {teamName} ({groupedOrders[teamName]?.length || 0}) {/* Ekipteki sipariş sayısı */}
            </Typography>
            <Box sx={{ maxHeight: '75vh', overflowY: 'auto', pr: 1 }}> {/* Dikey scroll */}
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

