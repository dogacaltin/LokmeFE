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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import BarChartIcon from "@mui/icons-material/BarChart";
import ThemeToggle from "./components/ThemeToggle";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { tr } from "date-fns/locale";
import { DatePicker } from "@mui/x-date-pickers";
import Tooltip from "@mui/material/Tooltip";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";

export default function Home() {
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
  const [editMode, setEditMode] = useState("full"); // "full" veya "note"
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedNoteOrder, setSelectedNoteOrder] = useState(null);
  const [noteContent, setNoteContent] = useState("");
  const [noteOrderId, setNoteOrderId] = useState(null);
  

  useEffect(() => {
    const fetchColumnsAndOrders = async () => {
      try {
        const colsRes = await fetch("http://localhost:8000/orders/columns");
        const colsJson = await colsRes.json();
        const cols = colsJson.columns.filter(
          (col) => col !== "id" && col !== "verildigi_tarih"
        );
        setColumns(cols);

        const formInit = {};
        cols.forEach((col) => {
          formInit[col] = "";
        });
        setNewOrder(formInit);

        const ordersRes = await fetch("http://localhost:8000/orders");
        const orderData = await ordersRes.json();
        const sortedOrders = orderData.sort(
          (a, b) => new Date(a.yapilacak_tarih) - new Date(b.yapilacak_tarih)
        );
        setOrders(sortedOrders);
      } catch (err) {
        console.error("Veri çekme hatası:", err);
      }
    };
    fetchColumnsAndOrders();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewOrder((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditNote = (order) => {
  setSelectedNoteOrder(order);
  setNoteDialogOpen(true);
  };

  const handleNoteSave = async () => {
  try {
    await fetch(`http://localhost:8000/orders/${selectedNoteOrder.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notlar: selectedNoteOrder.notlar }),
    });
    const updated = await fetch("http://localhost:8000/orders").then((res) =>
      res.json()
    );
    setOrders(updated);
    setNoteDialogOpen(false);
  } catch (err) {
    console.error("Notlar güncelleme hatası:", err);
  }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const url = editingId
      ? `http://localhost:8000/orders/${editingId}`
      : "http://localhost:8000/orders";
    const method = editingId ? "PUT" : "POST";

    try {
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      });
      setShowForm(false);
      setEditingId(null);
      const updated = await fetch("http://localhost:8000/orders").then((res) =>
        res.json()
      );
      setOrders(updated);
    } catch (err) {
      console.error("Sipariş kaydetme hatası:", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`http://localhost:8000/orders/${id}`, { method: "DELETE" });
      const updated = await fetch("http://localhost:8000/orders").then((res) =>
        res.json()
      );
      setOrders(updated);
    } catch (err) {
      console.error("Silme hatası:", err);
    }
  };

  const handleEdit = (order) => {
    const editable = { ...order };
    delete editable.id;
    delete editable.verildigi_tarih;
    setNewOrder(editable);
    setEditingId(order.id);
    setShowForm(true);
  };

  const now = new Date();
  const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);

  const filteredOrders = orders
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

  const tarih = yapilacakTarih?.getTime();

  const from = dateFrom
    ? new Date(
        new Date(dateFrom).setHours(0, 0, 0, 0) // 00:00:00.000
      ).getTime()
    : null;

  const to = dateTo
    ? new Date(
        new Date(dateTo).setHours(23, 59, 59, 999) // 23:59:59.999
      ).getTime()
    : null;

  const dateMatch = (!from || tarih >= from) && (!to || tarih <= to);

  const stringMatch = [
    order.musteri_isim,
    order.musteri_telefon,
    order.siparis,
    order.ekip,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(searchQuery.toLowerCase());

  const filterMatch =
    filterType === "all"
      ? true
      : filterType === "done"
      ? order.yapildi
      : !order.yapildi;

  return dateMatch && stringMatch && filterMatch;
})
    .sort((a, b) => {
      const aTime = new Date(a.yapilacak_tarih);
      const bTime = new Date(b.yapilacak_tarih);
      if (a.yapildi && b.yapildi) return bTime - aTime;
      if (!a.yapildi && !b.yapildi) return aTime - bTime;
      return a.yapildi ? 1 : -1;
    });

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
        </Stack>
      </Stack>

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
                value={newOrder[col]}
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
              const dateObj = new Date(order.yapilacak_tarih);
              const saat = dateObj.toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
              const tarih = dateObj.toLocaleDateString("tr-TR");
              return (
                <TableRow
                  key={idx}
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
