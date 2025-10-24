import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Stack, CircularProgress, Grid, Button, useTheme, IconButton, Tooltip
} from "@mui/material";
import LogoutIcon from '@mui/icons-material/Logout';
import ThemeToggle from "./components/ThemeToggle"; // ThemeToggle component'ının doğru yolda olduğundan emin olun
import { format, isSameDay, parseISO, startOfDay, addDays, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import BarChartIcon from "@mui/icons-material/BarChart";
import ReceiptIcon from "@mui/icons-material/Receipt"; // Siparişler için
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import TodayIcon from '@mui/icons-material/Today';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import DownloadIcon from '@mui/icons-material/Download'; // İndirme ikonu

// --- GÜNCELLENDİ: OrderCard (Text Wrapping için stiller + width) ---
const OrderCard = ({ order, theme }) => {
  const dateObj = order.yapilacak_tarih ? parseISO(order.yapilacak_tarih) : null;
  const saat = dateObj ? format(dateObj, 'HH:mm', { locale: tr }) : 'N/A';
  const longTextStyle = {
      wordBreak: 'break-word', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', maxWidth: '100%', lineHeight: 1.4,
  };

  return (
    // Paper'a width: '100%' eklendi
    <Paper elevation={3} sx={{ width: '100%', p: 2, mb: 2, backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#f9f9f9', borderLeft: `5px solid ${theme.palette.primary.main}`, borderRadius: '8px' }}>
      <Typography variant="subtitle1" fontWeight="bold" sx={longTextStyle}> {saat} - {order.siparis || 'Bilinmeyen Sipariş'} </Typography>
      <Typography variant="body2" sx={longTextStyle}>Müşteri: {order.musteri_isim || '-'}</Typography>
      <Typography variant="body2" sx={longTextStyle}>Telefon: {order.musteri_telefon || '-'}</Typography>
      {order.ekstra_telefon && ( <Typography variant="body2" sx={{ ...longTextStyle, color: theme.palette.info.main }}>Ekstra Tel: {order.ekstra_telefon}</Typography> )}
      <Typography variant="body2" sx={longTextStyle}>Adres: {order.adres || '-'}</Typography>
      <Typography variant="body2">Fiyat: {order.fiyat ? `${order.fiyat.toLocaleString('tr-TR')} ₺` : '-'}</Typography>
      {order.notlar && ( <Typography variant="body2" sx={{ ...longTextStyle, mt: 1, fontStyle: 'italic', color: theme.palette.warning.dark }}>Not: {order.notlar}</Typography> )}
    </Paper>
  );
};
// --- GÜNCELLEME SONU ---


export default function Planner() {
  const API_URL = process.env.REACT_APP_API_URL || "";
  const navigate = useNavigate();
  const theme = useTheme();
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const plannerContentRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Yetkisiz istekleri yakalayan fonksiyon
  const handleUnauthorized = async (error, context = "Unknown") => {
     console.error(`Authorization Error Handler Triggered from [${context}]:`, error);
    let status = null; let errorDetail = "Bilinmeyen Hata";
    if (error instanceof Response) { status = error.status; try { const rb = await error.clone().json(); errorDetail = rb.detail || error.statusText; console.error(`API Response Error: Status ${status}, Detail: ${errorDetail}`, "Response Body:", rb); } catch (e) { try { const rt = await error.text(); errorDetail = rt || error.statusText; console.error(`API Response Error: Status ${status}, Body is not JSON. Body Text:`, rt); } catch (e2) { errorDetail = error.statusText; console.error(`API Response Error: Status ${status}, Could not parse response body.`);} } }
    else if (error.response) { status = error.response.status; errorDetail = error.response.data?.detail || error.message; console.error(`Library Error Response: Status ${status}, Detail: ${errorDetail}`, "Response Data:", error.response.data); }
    else { errorDetail = error.message || "Ağ hatası."; console.error("Non-HTTP Error:", errorDetail, error); }
    if (status === 401) { console.warn("Unauthorized (401), logging out."); localStorage.removeItem("authToken"); localStorage.removeItem("authTokenTimestamp"); setTimeout(() => navigate("/"), 50); }
    else { console.log(`Error status ${status || 'N/A'} in context [${context}], not logging out.`); }
  };

  // Veri çekme efekti: Tüm siparişleri çeker
  useEffect(() => {
    let isMounted = true; setLoading(true); const token = localStorage.getItem("authToken"); if (!token) { navigate("/"); return; }
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    const fetchAllOrders = async () => {
      try {
        const ordersRes = await fetch(`${API_URL}/orders`, authHeaders);
        if (isMounted) {
          if (!ordersRes.ok) throw ordersRes;
          const orderData = await ordersRes.json();
          setAllOrders(orderData);
        }
      } catch (err) { if (isMounted) { handleUnauthorized(err, "Planner fetchAllOrders"); } }
      finally { if (isMounted) { setLoading(false); } }
    };
    fetchAllOrders(); return () => { isMounted = false; };
  }, [API_URL, navigate]);

  // Seçili tarihe göre filtreleme ve gruplama
  const { groupedOrders, teams } = useMemo(() => {
    if (loading || !selectedDate) return { groupedOrders: {}, teams: [] };
    const selectedDayOrders = allOrders.filter(o => o.yapilacak_tarih && isSameDay(parseISO(o.yapilacak_tarih), selectedDate));
    const groups = selectedDayOrders.reduce((acc, order) => {
      const team = order.ekip || "Ekip Belirtilmemiş"; if (!acc[team]) acc[team] = [];
      acc[team].push(order); acc[team].sort((a, b) => new Date(a.yapilacak_tarih) - new Date(b.yapilacak_tarih)); return acc;
    }, {});
    const teamNames = Object.keys(groups).sort();
    return { groupedOrders: groups, teams: teamNames };
  }, [allOrders, selectedDate, loading]);

  // Çıkış yapma fonksiyonu
  const handleLogout = () => { localStorage.removeItem("authToken"); localStorage.removeItem("authTokenTimestamp"); navigate("/"); };

  // Tarih değiştirme fonksiyonları
  const handleDateChange = (newDate) => { setSelectedDate(newDate ? startOfDay(newDate) : null); };
  const goToPreviousDay = () => { setSelectedDate(prev => prev ? subDays(prev, 1) : null); };
  const goToNextDay = () => { setSelectedDate(prev => prev ? addDays(prev, 1) : null); };
  const goToToday = () => { setSelectedDate(startOfDay(new Date())); };

  // --- GÜNCELLENDİ: PDF İndirme Fonksiyonu (A4 Boyutlandırma ve Çoklu Sayfa) ---
  const handleDownloadPDF = async () => {
    if (!plannerContentRef.current || isDownloading || teams.length === 0) return;

    setIsDownloading(true);
    const contentToCapture = plannerContentRef.current;
    const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : 'tarihsiz';
    const filename = `gunluk_plan_${dateStr}.pdf`;

    // PDF başlığını görünür yap
    const pdfHeader = contentToCapture.querySelector('.pdf-header');
    if (pdfHeader) pdfHeader.style.display = 'block';

    try {
        const canvas = await html2canvas(contentToCapture, {
            scale: 2, // Kalite için ölçek
            useCORS: true,
            logging: false,
            // scrollY: -window.scrollY // Bu bazen sorun yaratabilir, kaldırıldı
            width: contentToCapture.scrollWidth, // Tam genişliği al
            height: contentToCapture.scrollHeight, // Tam yüksekliği al
            windowWidth: contentToCapture.scrollWidth,
            windowHeight: contentToCapture.scrollHeight
        });

        // PDF başlığını tekrar gizle
        if (pdfHeader) pdfHeader.style.display = 'none';

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        // jsPDF'i A4 boyutunda (pt birimiyle) başlat
        const pdf = new jsPDF({
            orientation: 'p', // portrait
            unit: 'pt',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Resmin A4'e sığacak şekilde boyutunu ve oranını hesapla
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgScaledWidth = imgWidth * ratio;
        const imgScaledHeight = imgHeight * ratio;

        // Sayfa kenar boşlukları (isteğe bağlı)
        const margin = 20; // pt cinsinden
        const usableWidth = pdfWidth - 2 * margin;
        const usableHeight = pdfHeight - 2 * margin;

        // Resmin oranını koruyarak sığdırılacak boyutları tekrar hesapla
        let finalImgWidth = imgWidth;
        let finalImgHeight = imgHeight;
        if (imgWidth > usableWidth) {
            finalImgWidth = usableWidth;
            finalImgHeight = (imgHeight * usableWidth) / imgWidth;
        }
        if (finalImgHeight > usableHeight) {
            finalImgHeight = usableHeight;
            finalImgWidth = (imgWidth * usableHeight) / imgHeight;
        }

        // Resmi ortalamak için pozisyonları hesapla
        const xPos = margin + (usableWidth - finalImgWidth) / 2;
        const yPos = margin + (usableHeight - finalImgHeight) / 2;


        // Resmi PDF'e ekle (şimdilik tek sayfa)
        // Eğer içerik çok uzunsa, resmi bölüp birden fazla sayfaya eklemek gerekir.
        // Bu daha karmaşık bir mantık gerektirir. Şimdilik A4'e sığdırmaya çalışıyoruz.
        pdf.addImage(imgData, 'PNG', xPos, yPos, finalImgWidth, finalImgHeight);
        pdf.save(filename);

    } catch (error) {
        console.error("PDF oluşturulurken hata:", error);
        alert("PDF oluşturulurken bir hata oluştu.");
    } finally {
        // Orijinal stilleri geri yüklemek yerine, sadece başlığı gizle
        if (pdfHeader) pdfHeader.style.display = 'none';
        setIsDownloading(false);
    }
  };
  // --- GÜNCELLEME SONU ---


  // Yükleniyor durumu
  if (loading) { return (<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /><Typography sx={{ ml: 2 }}>Plan yükleniyor...</Typography></Box>); }

  const selectedDateFormatted = selectedDate ? format(selectedDate, 'dd MMMM yyyy, EEEE', { locale: tr }) : 'Tarih Seçilmedi';

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: "100vh", backgroundColor: theme.palette.background.default }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems="center" mb={3} spacing={2}>
        {/* Tarih Seçici ve Kontroller */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h6" component="h1" sx={{ mr: 1, whiteSpace: 'nowrap' }}>🗓️ Plan:</Typography>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                <DatePicker label="Tarih" value={selectedDate} onChange={handleDateChange} slotProps={{ textField: { size: 'small' } }} format="dd/MM/yyyy"/>
                 <Tooltip title="Önceki Gün"><IconButton onClick={goToPreviousDay} size="small"><ArrowBackIosNewIcon fontSize="inherit"/></IconButton></Tooltip>
                 <Tooltip title="Bugün"><IconButton onClick={goToToday} size="small" color="primary"><TodayIcon fontSize="inherit"/></IconButton></Tooltip>
                 <Tooltip title="Sonraki Gün"><IconButton onClick={goToNextDay} size="small"><ArrowForwardIosIcon fontSize="inherit"/></IconButton></Tooltip>
            </LocalizationProvider>
             <Tooltip title="Planı PDF Olarak İndir">
                 <span>
                    <IconButton color="secondary" onClick={handleDownloadPDF} disabled={isDownloading || teams.length === 0} size="small" sx={{ ml: 1 }} >
                         {isDownloading ? <CircularProgress size={20} /> : <DownloadIcon fontSize="inherit"/>}
                    </IconButton>
                 </span>
            </Tooltip>
        </Stack>
        {/* Header Butonları */}
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <ThemeToggle />
          <Button size="small" variant="contained" startIcon={<BarChartIcon />} onClick={() => navigate("/dashboard")}>Dashboard</Button>
          <Button size="small" variant="contained" color="primary" onClick={() => navigate("/giderler")}>Giderler</Button>
          <Button size="small" variant="contained" color="primary" startIcon={<ReceiptIcon />} onClick={() => navigate("/home")}>Siparişler</Button>
          <Button size="small" variant="contained" color="error" startIcon={<LogoutIcon />} onClick={handleLogout}>Çıkış Yap</Button>
        </Stack>
      </Stack>

      {/* Ekip Sütunları (PDF'e eklenecek içerik) */}
      {teams.length === 0 && !loading ? (
           <Typography sx={{mt: 4, textAlign: 'center'}}>Seçili gün için planlanmış sipariş bulunmamaktadır.</Typography>
       ) : (
      // PDF içeriği için Box'a ref verildi
      <Box ref={plannerContentRef} sx={{ width: '100%', overflow: 'hidden', backgroundColor: theme.palette.background.default }}> {/* Arkaplan rengi eklendi */}
          {/* PDF içinde görünecek başlık (Gizli) */}
          <Typography variant="h5" component="h2" sx={{ mb: 3, textAlign: 'center', display: 'none', color: '#000' }} className="pdf-header"> {/* PDF için renk siyah */}
             🗓️ Günün Planı - {selectedDateFormatted}
          </Typography>
          <Grid container spacing={3}>
            {teams.map((teamName) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={teamName}>
                <Typography variant="h6" align="center" sx={{ mb: 2, p: 1, backgroundColor: theme.palette.primary.light, color: theme.palette.primary.contrastText, borderRadius: '4px' }}>
                    {teamName} ({groupedOrders[teamName]?.length || 0})
                </Typography>
                <Box> {/* Scroll kaldırıldı */}
                    {groupedOrders[teamName]?.map((order) => (
                      // PDF için tema'dan bağımsız renkler vermek daha iyi olabilir
                      // Şimdilik tema renklerini kullanıyoruz
                      <OrderCard key={order.id} order={order} theme={theme} />
                    ))}
                </Box>
              </Grid>
            ))}
          </Grid>
      </Box>
       )}
    </Box>
  );
}

