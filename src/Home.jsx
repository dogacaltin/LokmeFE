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
  
  const handleUnauthorized = (error) => {
    if (error.response && error.response.status === 401) {
        localStorage.removeItem("authToken");
        navigate("/");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/");
      return;
    }

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    const fetchColumnsAndOrders = async () => {
      try {
        const colsRes = await fetch(`${API_URL}/orders/columns`, authHeaders); 
        if (!colsRes.ok) throw { response: colsRes };
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

        const ordersRes = await fetch(`${API_URL}/orders`, authHeaders);
        if (!ordersRes.ok) throw { response: ordersRes };
        const orderData = await ordersRes.json();
        const sortedOrders = orderData.sort(
          (a, b) => new Date(a.yapilacak_tarih) - new Date(b.yapilacak_tarih)
        );
        setOrders(sortedOrders);
      } catch (err) {
        console.error("Veri çekme hatası:", err);
        handleUnauthorized(err);
      }
    };
    fetchColumnsAndOrders();
  }, [API_URL, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewOrder((prev) => ({ ...prev, [name]: value }));
  };

  const handleNoteSave = async () => {
    const token = localStorage.getItem("authToken");
    try {
      await fetch(`${API_URL}/orders${noteOrderId}`, { 
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notlar: noteContent }),
      });
      const updatedOrders = orders.map(o => o.id === noteOrderId ? {...o, notlar: noteContent} : o);
      setOrders(updatedOrders);
      setNoteDialogOpen(false);
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

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newOrder),
      });
      if (!response.ok) throw { response };

      setShowForm(false);
      setEditingId(null);
      const ordersRes = await fetch(`${API_URL}/orders`, { headers: { Authorization: `Bearer ${token}` } });
      const updated = await ordersRes.json();
      setOrders(updated);
    } catch (err) {
      console.error("Sipariş kaydetme hatası:", err);
      handleUnauthorized(err);
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("authToken");
    try {
      await fetch(`${API_URL}/orders/${id}`, { 
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
      });
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
        new Date(dateFrom).setHours(0, 0, 0, 0)
      ).getTime()
    : null;

  const to = dateTo
    ? new Date(
        new Date(dateTo).setHours(23, 59, 59, 999)
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
      if (!a.yapilacak_tarih || !b.yapilacak_tarih) return 0;
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
          <Button variant="contained" color="error" startIcon={<LogoutIcon />} onClick={handleLogout}>
            Çıkış Yap
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} mb={3}>
        <TextField
          label="Ara..."
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ backgroundColor: theme.palette.mode === "dark" ? "#2c2c2c" : "#f5f5f5", borderRadius: 1, flexGrow: 1 }}
        />
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
          <DatePicker
            label="Başlangıç Tarihi"
            value={dateFrom}
            onChange={(newValue) => setDateFrom(newValue)}
          />
          <DatePicker
            label="Bitiş Tarihi"
            value={dateTo}
            onChange={(newValue) => setDateTo(newValue)}
          />
          <Tooltip title="Tarih filtresini temizle">
            <IconButton color="primary" onClick={() => { setDateFrom(null); setDateTo(null); }}>
              <CleaningServicesIcon />
            </IconButton>
          </Tooltip>
        </LocalizationProvider>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowForm(true)}
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
                value={newOrder[col] || ""}
                onChange={handleInputChange}
                type={
                  col.includes("tarih")
                    ? "datetime-local"
                    : col === "fiyat"
                    ? "number"
                    : "text"
                }
                InputLabelProps={{ shrink: true }}
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
>
  <DialogTitle>📝 Notlar</DialogTitle>
  <DialogContent>
      <TextField
          autoFocus
          margin="dense"
          id="name"
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
    <Button onClick={() => handleNoteSave({ id: noteOrderId, notlar: noteContent })}>Kaydet</Button>
  </DialogActions>
</Dialog>

      <TableContainer component={Paper}>
        <Table>
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
                  return (<TableCell key={col}>{headers[col] || col}</TableCell>);
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
                <TableRow key={order.id} hover>
                  <TableCell>{saat}</TableCell>
                  <TableCell>{tarih}</TableCell>
                  {columns
                    .filter((col) => !["id", "yapilacak_tarih", "verildigi_tarih", "notlar"].includes(col))
                    .map((col) => (
                      <TableCell key={col}>{order[col]}</TableCell>
                    ))}
                  <TableCell>
                    <IconButton onClick={() => handleEdit(order)}><EditIcon /></IconButton>
                    <IconButton color="error" onClick={() => handleDelete(order.id)}><DeleteIcon /></IconButton>
                    <IconButton
                      onClick={() => {
                        setNoteContent(order.notlar || "");
                        setNoteOrderId(order.id);
                        setNoteDialogOpen(true);
                      }}
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

