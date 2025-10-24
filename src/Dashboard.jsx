import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Paper
} from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ThemeToggle from "./components/ThemeToggle";
import {
  DatePicker,
  LocalizationProvider,
} from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import tr from "date-fns/locale/tr";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";
import {
  startOfWeek,
  addDays,
  subWeeks,
  subMonths,
  format,
} from "date-fns";
// YENİ: Çıkış ikonu eklendi
import LogoutIcon from '@mui/icons-material/Logout';

const generateColor = (index, total) => {
  const hue = (index * 360) / total;
  return `hsl(${hue}, 70%, 55%)`;
};

function Dashboard() {
  const API_URL = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [interval, setInterval] = useState("daily"); // Varsayılanı 'daily' olarak bırakıyoruz, menüde farklı gösterilebilir
  const [selectedDate, setSelectedDate] = useState(new Date());

  // YENİ: Yetkisiz istekleri yakalayan yardımcı fonksiyon
  const handleUnauthorized = (error) => {
    // Yanıtın status kodunu kontrol et
    const status = error.response ? error.response.status : (error instanceof Response ? error.status : null);
    if (status === 401) {
      localStorage.removeItem("authToken");
      navigate("/");
    }
  };


  const getTurkishIntervalLabel = (key) => {
    switch (key) {
      case "daily": return "Haftalık (Gün Gün)"; // Menüdeki metinle eşleşmeli
      case "weekly": return "Haftalık";
      case "monthly": return "Aylık";
      case "yearly": return "Yıllık";
      default: return "";
    }
  };

  useEffect(() => {
    // YENİ: Token'ı al ve kontrol et
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/"); // Token yoksa login'e yönlendir
      return;
    }
    // YENİ: Tüm istekler için standart başlık (header)
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };


    const fetchOrders = async () => {
      try {
        // YENİ: İsteklere authHeaders eklendi
        const response = await fetch(`${API_URL}/orders`, authHeaders);

        if (!response.ok) {
            // YENİ: Daha detaylı hata yönetimi
            if (response.status === 401) {
                // Token geçersizse, hata yönetimi fonksiyonunu çağır
                handleUnauthorized({ response: response });
                return; // Fonksiyondan çık
            }
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        setOrders(data);
      } catch (err) {
        console.error("Veri çekme hatası:", err);
        // handleUnauthorized zaten response objesi bekliyor
        if (err.response) {
            handleUnauthorized(err);
        } else {
             // Ağ hatası veya fetch içindeki diğer hatalar için genel mesaj
             console.error("Beklenmedik bir hata oluştu:", err.message);
        }
      }
    };
    fetchOrders();
  }, [API_URL, navigate]); // YENİ: navigate bağımlılıklara eklendi

  const getRangeKeys = () => {
    const keys = [];
    const parsedSelectedDate = selectedDate || new Date();
    if (interval === "daily") { // Haftanın günleri için
      const startOfSelectedWeek = startOfWeek(parsedSelectedDate, { locale: tr });
      for (let i = 0; i < 7; i++) {
        const d = addDays(startOfSelectedWeek, i);
        keys.push(format(d, "dd/MM/yyyy"));
      }
    } else if (interval === "weekly") { // Son 5 hafta için
      for (let i = 4; i >= 0; i--) {
        const start = startOfWeek(subWeeks(parsedSelectedDate, i), { locale: tr });
        keys.push(`Hafta: ${format(start, "dd/MM/yyyy")}`);
      }
    } else if (interval === "monthly") { // Son 4 ay için
      for (let i = 3; i >= 0; i--) {
        const month = subMonths(parsedSelectedDate, i);
        keys.push(format(month, "MMMM yyyy", { locale: tr }));
      }
    } else if (interval === "yearly") { // Son 5 yıl için
      for (let i = 4; i >= 0; i--) {
        keys.push((parsedSelectedDate.getFullYear() - i).toString());
      }
    }
    return keys;
  };

  const barDataKeys = getRangeKeys();
  // YENİ: siparis alanı olmayanları filtrele
  const validOrders = orders.filter(o => o.siparis && o.yapilacak_tarih);
  const allTypes = new Set(validOrders.map(o => o.siparis.trim() || "Bilinmeyen"));
  const stackedMap = {};
  barDataKeys.forEach((k) => (stackedMap[k] = {}));

  validOrders.forEach((order) => {
    const d = new Date(order.yapilacak_tarih);
    const type = order.siparis.trim() || "Bilinmeyen";

    let key = "";
    if (interval === "daily") {
      key = format(d, "dd/MM/yyyy");
    } else if (interval === "weekly") {
      const start = startOfWeek(d, { locale: tr });
      key = `Hafta: ${format(start, "dd/MM/yyyy")}`;
    } else if (interval === "monthly") {
      key = format(d, "MMMM yyyy", { locale: tr });
    } else if (interval === "yearly") {
      key = d.getFullYear().toString();
    }

    if (stackedMap[key]) {
      stackedMap[key][type] = (stackedMap[key][type] || 0) + 1;
    }
  });

  const barChartData = barDataKeys.map(key => {
      const entry = { date: key };
      allTypes.forEach(type => {
          entry[type] = stackedMap[key]?.[type] || 0;
      });
      return entry;
  });


  const isInSelectedRange = (dateStr) => {
    if(!dateStr) return false;
    const d = new Date(dateStr);
    const parsedSelectedDate = selectedDate || new Date();
    if (interval === "daily") { // Haftalık (Gün Gün)
        const startOfSelectedWeek = startOfWeek(parsedSelectedDate, { locale: tr });
        const endOfSelectedWeek = addDays(startOfSelectedWeek, 6);
        // Günün başlangıcı ve bitişini dikkate alarak kontrol et
        const dayStart = new Date(d.setHours(0,0,0,0));
        const dayEnd = new Date(d.setHours(23,59,59,999));
        return dayStart >= startOfSelectedWeek && dayEnd <= endOfSelectedWeek;
    } else if (interval === "weekly") { // Haftalık (Son 5 Hafta)
      // Bu aralığa giren tüm haftaların anahtarlarını oluştur
      const weekKeysInRange = [];
      for (let i = 4; i >= 0; i--) {
         const start = startOfWeek(subWeeks(parsedSelectedDate, i), { locale: tr });
         weekKeysInRange.push(`Hafta: ${format(start, "dd/MM/yyyy")}`);
      }
      // Verilen tarihin haftası bu anahtarlardan biri mi?
      const currentWeekKey = `Hafta: ${format(startOfWeek(d, { locale: tr }), "dd/MM/yyyy")}`;
      return weekKeysInRange.includes(currentWeekKey);

    } else if (interval === "monthly") { // Aylık (Son 4 Ay)
      const monthKeysInRange = [];
      for (let i = 3; i >= 0; i--) {
         const month = subMonths(parsedSelectedDate, i);
         monthKeysInRange.push(format(month, "MMMM yyyy", { locale: tr }));
      }
      const currentMonthKey = format(d, "MMMM yyyy", { locale: tr });
      return monthKeysInRange.includes(currentMonthKey);

    } else if (interval === "yearly") { // Yıllık (Son 5 Yıl)
      const yearKeysInRange = [];
       for (let i = 4; i >= 0; i--) {
         yearKeysInRange.push((parsedSelectedDate.getFullYear() - i).toString());
      }
      return yearKeysInRange.includes(d.getFullYear().toString());
    }
    return false;
  };

  // YENİ: siparis ve tarih alanı olanları filtrele
  const filteredOrders = validOrders.filter((order) =>
    isInSelectedRange(order.yapilacak_tarih)
  );

  const pieChartData = Array.from(allTypes).map((type) => ({
    name: type,
    value: filteredOrders.filter(
      (order) => (order.siparis.trim() || "Bilinmeyen") === type
    ).length,
  })).filter(item => item.value > 0);

  // YENİ: Çıkış yapma fonksiyonu
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/");
  };

  // YENİ: Daha dinamik başlıklar için
   const intervalTitles = {
    daily: `Hafta (${format(startOfWeek(selectedDate || new Date(), {locale: tr}), "dd MMM", {locale: tr})})`,
    weekly: "Son 5 Hafta",
    monthly: "Son 4 Ay",
    yearly: "Son 5 Yıl",
  };

  // YENİ: Mevcut periyoda göre sipariş sayısı
  const currentPeriodFilterLength = validOrders.filter((o) => {
    const d = new Date(o.yapilacak_tarih);
    const today = selectedDate || new Date(); // Seçili tarihi baz al
    if (interval === "daily") { // Seçili haftanın tamamı
        const start = startOfWeek(today, { locale: tr });
        const end = addDays(start, 6);
         // Günün başlangıcı ve bitişini dikkate alarak kontrol et
        const dayStart = new Date(d.setHours(0,0,0,0));
        const dayEnd = new Date(d.setHours(23,59,59,999));
        return dayStart >= start && dayEnd <= end;
    }
    if (interval === "weekly") { // Seçili tarihten önceki 5 hafta
        const fiveWeeksAgo = startOfWeek(subWeeks(today, 4), { locale: tr });
        const endOfSelectedWeek = addDays(startOfWeek(today, {locale: tr}), 6);
         // Günün başlangıcı ve bitişini dikkate alarak kontrol et
        const dayStart = new Date(d.setHours(0,0,0,0));
        const dayEnd = new Date(d.setHours(23,59,59,999));
        return dayStart >= fiveWeeksAgo && dayEnd <= endOfSelectedWeek;
    }
    if (interval === "monthly") { // Seçili tarihten önceki 4 ay
        const fourMonthsAgo = new Date(today);
        fourMonthsAgo.setMonth(today.getMonth() - 3, 1); // 4 ay öncesinin ilk günü
        fourMonthsAgo.setHours(0,0,0,0);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Seçili ayın son günü
        endOfMonth.setHours(23,59,59,999);
         // Günün başlangıcı ve bitişini dikkate alarak kontrol et
        const dayStart = new Date(d.setHours(0,0,0,0));
        const dayEnd = new Date(d.setHours(23,59,59,999));
        return dayStart >= fourMonthsAgo && dayEnd <= endOfMonth;
    }
    if (interval === "yearly") { // Seçili tarihten önceki 5 yıl
        const fiveYearsAgo = today.getFullYear() - 4;
        const endOfYear = new Date(today.getFullYear(), 11, 31); // Seçili yılın son günü
        endOfYear.setHours(23,59,59,999);
        return d.getFullYear() >= fiveYearsAgo && d <= endOfYear;
    }
    return false;
  }).length;


  return (
    <Box sx={{ p: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">📊 Dashboard</Typography>
        <Stack direction="row" spacing={1}>
          <ThemeToggle />
          <Button variant="contained" color="primary" onClick={() => navigate("/planner")}>
            Takvim
          </Button>
          <Button variant="contained" color="primary" startIcon={<ReceiptIcon />} onClick={() => navigate("/home")}>
            Siparişler
          </Button>
          <Button variant="contained" color="primary" startIcon={<BarChartIcon />} onClick={() => navigate("/giderler")}>
            Giderler
          </Button>
          {/* YENİ: Çıkış yap butonu */}
          <Button variant="contained" color="error" startIcon={<LogoutIcon />} onClick={handleLogout}>
            Çıkış Yap
          </Button>
        </Stack>
      </Stack>

      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
        <Stack direction="row" spacing={2} alignItems="center" marginBottom={3}>
          <TextField
            select
            label="Zaman Aralığı"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            variant="outlined"
            size="small"
            sx={{minWidth: 150}}
          >
            {/* Menü değerleri getTurkishIntervalLabel ile eşleşmeli */}
            <MenuItem value="daily">Haftalık (Gün Gün)</MenuItem>
            <MenuItem value="weekly">Haftalık</MenuItem>
            <MenuItem value="monthly">Aylık</MenuItem>
            <MenuItem value="yearly">Yıllık</MenuItem>
          </TextField>

          <DatePicker
            label="Referans Tarih" // YENİ: Etiket değiştirildi
            value={selectedDate}
            onChange={(newValue) => setSelectedDate(newValue)}
            slotProps={{
              textField: {
                variant: "outlined",
                size: "small",
              },
            }}
          />
        </Stack>
      </LocalizationProvider>

      <Typography variant="h5" gutterBottom>
        {getTurkishIntervalLabel(interval)} Sipariş Sayısı
      </Typography>
      <BarChart width={730} height={250} data={barChartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        {[...allTypes].map((type, index) => (
          <Bar
            key={type}
            dataKey={type}
            stackId="a"
            fill={generateColor(index, allTypes.size)}
          />
        ))}
      </BarChart>

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Sipariş Dağılımı ({intervalTitles[interval]})
      </Typography>
       <PieChart width={730} height={300}>
        <Pie
          data={pieChartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={80} // Biraz daha küçük iç yarıçap
          outerRadius={120} // Biraz daha küçük dış yarıçap
          paddingAngle={5}
        >
          {pieChartData.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={generateColor(index, pieChartData.length)}
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>

      <Stack direction="row" spacing={3} mt={4}>
        <Paper elevation={3} sx={{ p: 2, flexGrow: 1, textAlign: 'center' }}>
            <Typography variant="h6">📦 Toplam Sipariş ({intervalTitles[interval]})</Typography>
            <Typography variant="h4" component="p">{filteredOrders.length}</Typography>
        </Paper>
        <Paper elevation={3} sx={{ p: 2, flexGrow: 1, textAlign: 'center' }}>
            <Typography variant="h6">💰 Toplam Gelir ({intervalTitles[interval]})</Typography>
            <Typography variant="h4" component="p">
                {filteredOrders.reduce((acc, cur) => acc + Number(cur.fiyat || 0), 0).toLocaleString('tr-TR')} ₺
            </Typography>
        </Paper>
        <Paper elevation={3} sx={{ p: 2, flexGrow: 1, textAlign: 'center' }}>
          <Typography variant="h6">
             📅 Seçili Periyot Siparişleri {/* YENİ: Başlık sabit */}
          </Typography>
          <Typography variant="h4" component="p">
            {currentPeriodFilterLength}
          </Typography>
        </Paper>
      </Stack>
    </Box>
  );
}

export default Dashboard;

