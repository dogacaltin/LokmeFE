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

const generateColor = (index, total) => {
  const hue = (index * 360) / total;
  return `hsl(${hue}, 70%, 55%)`;
};

function Dashboard() {
  const API_URL = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [interval, setInterval] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const getTurkishIntervalLabel = (key) => {
    switch (key) {
      case "daily": return "Günlük";
      case "weekly": return "Haftalık";
      case "monthly": return "Aylık";
      case "yearly": return "Yıllık";
      default: return "";
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/"); // Token yoksa login'e yönlendir
      return;
    }

    const fetchOrders = async () => {
      try {
        const response = await fetch(`${API_URL}/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            // Eğer token geçersizse (401 Unauthorized), kullanıcıyı login'e at
            if (response.status === 401) {
                localStorage.removeItem("authToken");
                navigate("/");
            }
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        setOrders(data);
      } catch (err) {
        console.error("Veri çekme hatası:", err);
      }
    };
    fetchOrders();
  }, [API_URL, navigate]);

  const getRangeKeys = () => {
    const keys = [];
    const parsedSelectedDate = selectedDate || new Date();
    if (interval === "daily") {
      for (let i = 0; i < 7; i++) {
        const d = addDays(startOfWeek(parsedSelectedDate, { locale: tr }), i);
        keys.push(format(d, "dd/MM/yyyy"));
      }
    } else if (interval === "weekly") {
      for (let i = 4; i >= 0; i--) {
        const start = startOfWeek(subWeeks(parsedSelectedDate, i), { locale: tr });
        keys.push(`Hafta: ${format(start, "dd/MM/yyyy")}`);
      }
    } else if (interval === "monthly") {
      for (let i = 3; i >= 0; i--) {
        const month = subMonths(parsedSelectedDate, i);
        keys.push(format(month, "MMMM yyyy", { locale: tr }));
      }
    } else if (interval === "yearly") {
      for (let i = 4; i >= 0; i--) {
        keys.push((parsedSelectedDate.getFullYear() - i).toString());
      }
    }
    return keys;
  };

  const barDataKeys = getRangeKeys();
  const allTypes = new Set(orders.map(o => o.siparis?.trim() || "Bilinmeyen"));
  const stackedMap = {};
  barDataKeys.forEach((k) => (stackedMap[k] = {}));

  orders.forEach((order) => {
    if (!order.yapilacak_tarih) return;
    const d = new Date(order.yapilacak_tarih);
    const type = order.siparis?.trim() || "Bilinmeyen";

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

  const barChartData = Object.entries(stackedMap).map(([date, types]) => {
    const entry = { date };
    allTypes.forEach((type) => {
      entry[type] = types[type] || 0;
    });
    return entry;
  });

  const isInSelectedRange = (dateStr) => {
    if(!dateStr) return false;
    const d = new Date(dateStr);
    const parsedSelectedDate = selectedDate || new Date();
    if (interval === "daily") {
        const startOfSelectedWeek = startOfWeek(parsedSelectedDate, { locale: tr });
        const endOfSelectedWeek = addDays(startOfSelectedWeek, 6);
        return d >= startOfSelectedWeek && d <= endOfSelectedWeek;
    } else if (interval === "weekly") {
      const weekKey = `Hafta: ${format(startOfWeek(d, { locale: tr }), "dd/MM/yyyy")}`;
      return barDataKeys.includes(weekKey);
    } else if (interval === "monthly") {
      const monthKey = format(d, "MMMM yyyy", { locale: tr });
      return barDataKeys.includes(monthKey);
    } else if (interval === "yearly") {
      return barDataKeys.includes(d.getFullYear().toString());
    }
    return false;
  };

  const filteredOrders = orders.filter((order) =>
    isInSelectedRange(order.yapilacak_tarih)
  );

  const pieChartData = Array.from(allTypes).map((type) => ({
    name: type,
    value: filteredOrders.filter(
      (order) => (order.siparis?.trim() || "Bilinmeyen") === type
    ).length,
  })).filter(item => item.value > 0);
  
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/");
  };
  
  const intervalTitles = {
    daily: "Bugünkü Sipariş",
    weekly: "Bu Haftaki Sipariş",
    monthly: "Bu Ayki Sipariş",
    yearly: "Bu Yılki Sipariş",
  };
  
  const todayFilterLength = orders.filter((o) => {
    if(!o.yapilacak_tarih) return false;
    const d = new Date(o.yapilacak_tarih);
    const today = new Date();
    if (interval === "daily") return d.toDateString() === today.toDateString();
    if (interval === "weekly") {
        const start = startOfWeek(today, { locale: tr });
        const end = addDays(start, 6);
        return d >= start && d <= end;
    }
    if (interval === "monthly") return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    if (interval === "yearly") return d.getFullYear() === today.getFullYear();
    return false;
  }).length;

  return (
    <Box sx={{ p: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">📊 Dashboard</Typography>
        <Stack direction="row" spacing={1}>
          <ThemeToggle />
          <Button variant="contained" color="primary" startIcon={<ReceiptIcon />} onClick={() => navigate("/home")}>
            Siparişler
          </Button>
          <Button variant="contained" color="primary" startIcon={<BarChartIcon />} onClick={() => navigate("/giderler")}>
            Giderler
          </Button>
          <Button variant="contained" color="error" onClick={handleLogout}>
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
            <MenuItem value="daily">Haftalık (Gün Gün)</MenuItem>
            <MenuItem value="weekly">Haftalık</MenuItem>
            <MenuItem value="monthly">Aylık</MenuItem>
            <MenuItem value="yearly">Yıllık</MenuItem>
          </TextField>

          <DatePicker
            label="Tarih Seç"
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
        Sipariş Dağılımı ({getTurkishIntervalLabel(interval)})
      </Typography>
       <PieChart width={730} height={300}>
        <Pie
          data={pieChartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={80}
          outerRadius={120}
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
            <Typography variant="h6">📦 Toplam Sipariş</Typography>
            <Typography variant="h4" component="p">{filteredOrders.length}</Typography>
        </Paper>
        <Paper elevation={3} sx={{ p: 2, flexGrow: 1, textAlign: 'center' }}>
            <Typography variant="h6">💰 Toplam Gelir</Typography>
            <Typography variant="h4" component="p">
                {filteredOrders.reduce((acc, cur) => acc + Number(cur.fiyat || 0), 0).toLocaleString('tr-TR')} ₺
            </Typography>
        </Paper>
        <Paper elevation={3} sx={{ p: 2, flexGrow: 1, textAlign: 'center' }}>
          <Typography variant="h6">
            📅 {intervalTitles[interval]}
          </Typography>
          <Typography variant="h4" component="p">
            {todayFilterLength}
          </Typography>
        </Paper>
      </Stack>
    </Box>
  );
}

export default Dashboard;

