import React, { useEffect, useState } from "react";
import {
  Button,
  Stack,
  Typography,
  TextField,
  MenuItem,
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
  subYears,
  format,
} from "date-fns";

const generateColor = (index, total) => {
  const hue = (index * 360) / total;
  return `hsl(${hue}, 70%, 55%)`;
};

function Dashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [interval, setInterval] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const parsedSelectedDate = new Date(selectedDate);

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
    const fetchOrders = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/orders`);
        const data = await response.json();
        setOrders(data);
      } catch (err) {
        console.error("Veri çekme hatası:", err);
      }
    };
    fetchOrders();
  }, []);

  const getRangeKeys = () => {
    const keys = [];
    if (interval === "daily") {
      for (let i = 0; i < 7; i++) {
        const d = addDays(parsedSelectedDate, i);
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
  const allTypes = new Set();
  const stackedMap = {};
  barDataKeys.forEach((k) => (stackedMap[k] = {}));

  orders.forEach((order) => {
    const d = new Date(order.yapilacak_tarih);
    const type = order.siparis?.trim() || "Bilinmeyen";
    allTypes.add(type);

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

  const isInSelectedRange = (date) => {
    const d = new Date(date);
    if (interval === "daily") {
      return barDataKeys.includes(format(d, "dd/MM/yyyy"));
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
  }));

  return (
    <div style={{ padding: "30px" }}>
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
          >
            <MenuItem value="daily">Günlük</MenuItem>
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
                InputProps: { readOnly: true },
              },
            }}
          />
        </Stack>
      </LocalizationProvider>

      <h3>📉 {getTurkishIntervalLabel(interval)} Sipariş Sayısı</h3>
      <BarChart width={700} height={300} data={barChartData}>
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

      <h3 style={{ marginTop: "40px" }}>🍩 Sipariş Dağılımı</h3>
      <PieChart width={500} height={400}>
        <Pie
          data={pieChartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={90}
          outerRadius={150}
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

      <div style={{ display: "flex", gap: "30px", marginTop: "40px" }}>
        <div style={{ background: "#f0f8ff", padding: "20px", borderRadius: "10px" }}>
          <h4>📦 Toplam Sipariş</h4>
          <p style={{ fontSize: "24px", fontWeight: "bold" }}>
            {filteredOrders.length}
          </p>
        </div>
        <div style={{ background: "#fff0f5", padding: "20px", borderRadius: "10px" }}>
          <h4>💰 Toplam Gelir</h4>
          <p style={{ fontSize: "24px", fontWeight: "bold" }}>
            {filteredOrders.reduce((acc, cur) => acc + Number(cur.fiyat || 0), 0)} ₺
          </p>
        </div>
        <div style={{ background: "#f5fffa", padding: "20px", borderRadius: "10px" }}>
          <h4>
            📅 {{
              daily: "Bugünkü Sipariş",
              weekly: "Bu Haftaki Sipariş",
              monthly: "Bu Ayki Sipariş",
              yearly: "Bu Yılki Sipariş",
            }[interval]}
          </h4>
          <p style={{ fontSize: "24px", fontWeight: "bold" }}>
            {orders.filter((o) => {
              const d = new Date(o.yapilacak_tarih);
              const today = new Date();

              if (interval === "daily") {
                return d.toDateString() === today.toDateString();
              } else if (interval === "weekly") {
                const start = startOfWeek(today, { locale: tr });
                const end = addDays(start, 6);
                return d >= start && d <= end;
              } else if (interval === "monthly") {
                return (
                  d.getFullYear() === today.getFullYear() &&
                  d.getMonth() === today.getMonth()
                );
              } else if (interval === "yearly") {
                return d.getFullYear() === today.getFullYear();
              }
              return false;
            }).length}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;