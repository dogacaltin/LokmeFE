import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import BarChartIcon from "@mui/icons-material/BarChart";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import tr from "date-fns/locale/tr";
import ThemeToggle from "./components/ThemeToggle";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";



const Giderler = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL;
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ tutar: "", aciklama: "", tarih: "" });
  const [editingExpense, setEditingExpense] = useState(null);
  const [editForm, setEditForm] = useState({ tutar: "", aciklama: "", tarih: "" });

  // 🔄 Giderleri çek
  useEffect(() => {
    axios.get(`${API_URL}/expenses`)
      .then((res) => setExpenses(res.data))
      .catch((err) => console.error("Giderler alınamadı:", err));
  }, []);

  // ➕ Yeni gider ekle
  const handleFormSubmit = () => {
    axios.post(`${API_URL}/expenses`, newExpense)
      .then((res) => {
        setExpenses((prev) => [...prev, res.data]);
        setShowForm(false);
        setNewExpense({ tutar: "", aciklama: "", tarih: "" });
      })
      .catch((err) => console.error("Gider eklenemedi:", err));
  };

  // 🗑️ Gider sil
  const handleDelete = (id) => {
    axios.delete(`${API_URL}/expenses/${id}`)
      .then(() => setExpenses((prev) => prev.filter((e) => e.id !== id)))
      .catch((err) => console.error("Silme hatası:", err));
  };

  // 📝 Düzenleme
  const handleEditClick = (expense) => {
    setEditingExpense(expense);
    setEditForm({
      tutar: expense.tutar,
      aciklama: expense.aciklama,
      tarih: expense.tarih,
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSave = () => {
    axios.put(`${API_URL}/expenses/${editingExpense.id}`, editForm)
      .then((res) => {
        setExpenses((prev) =>
          prev.map((exp) => (exp.id === editingExpense.id ? res.data : exp))
        );
        setEditingExpense(null);
      })
      .catch((err) => console.error("Güncelleme hatası:", err));
  };

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch = Object.values(exp).some((val) =>
      val.toString().toLowerCase().includes(searchQuery.toLowerCase())
    );
    const date = new Date(exp.tarih);
    const matchesDate =
      (!dateFrom || date >= new Date(dateFrom)) &&
      (!dateTo || date <= new Date(dateTo));
    return matchesSearch && matchesDate;
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewExpense((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">📉 Giderler</Typography>
        <Stack direction="row" spacing={1}>
          <ThemeToggle />
          <Button variant="contained" startIcon={<BarChartIcon />} onClick={() => navigate("/dashboard")}>
            Dashboard
          </Button>
          <Button variant="contained" onClick={() => navigate("/home")}>
            Siparişler
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
      </Stack>

      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
        <Stack direction="row" spacing={2} alignItems="center">
          <DatePicker
            label="Başlangıç Tarihi"
            value={dateFrom}
            onChange={(newValue) => setDateFrom(newValue)}
            slotProps={{ textField: { variant: "outlined", InputProps: { readOnly: true } } }}
          />
          <DatePicker
            label="Bitiş Tarihi"
            value={dateTo}
            onChange={(newValue) => setDateTo(newValue)}
            slotProps={{ textField: { variant: "outlined", inputProps: { readOnly: true } } }}
          />
          <Tooltip title="Tarih filtresini temizle">
            <IconButton color="primary" onClick={() => { setDateFrom(null); setDateTo(null); }}>
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
            backgroundColor: "#e0e0e0",
            boxShadow: "0px 6px 16px rgba(0, 0, 0, 0.3)",
          },
        }}
      >
        GİDER EKLE
      </Button>

      {/* ➕ Yeni gider ekleme formu */}
      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <DialogTitle>Yeni Gider</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField name="tutar" label="Tutar" type="number" value={newExpense.tutar} onChange={handleInputChange} />
            <TextField name="aciklama" label="Açıklama" multiline rows={2} value={newExpense.aciklama} onChange={handleInputChange} />
            <TextField name="tarih" label="Tarih" type="datetime-local" InputLabelProps={{ shrink: true }} value={newExpense.tarih} onChange={handleInputChange} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowForm(false)}>İptal</Button>
          <Button variant="contained" onClick={handleFormSubmit}>Kaydet</Button>
        </DialogActions>
      </Dialog>

      {/* ✏️ Gider düzenleme formu */}
      <Dialog open={Boolean(editingExpense)} onClose={() => setEditingExpense(null)}>
        <DialogTitle>Gideri Düzenle</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField name="tutar" label="Tutar" type="number" value={editForm.tutar} onChange={handleEditChange} />
            <TextField name="aciklama" label="Açıklama" multiline rows={2} value={editForm.aciklama} onChange={handleEditChange} />
            <TextField name="tarih" label="Tarih" type="datetime-local" InputLabelProps={{ shrink: true }} value={editForm.tarih} onChange={handleEditChange} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingExpense(null)}>İptal</Button>
          <Button variant="contained" onClick={handleEditSave}>Kaydet</Button>
        </DialogActions>
      </Dialog>

      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ backgroundColor: "#1976d2", color: "white", fontWeight: "bold" }}>Saat</TableCell>
              <TableCell sx={{ backgroundColor: "#1976d2", color: "white", fontWeight: "bold" }}>Tarih</TableCell>
              <TableCell sx={{ backgroundColor: "#1976d2", color: "white", fontWeight: "bold" }}>Tutar</TableCell>
              <TableCell sx={{ backgroundColor: "#1976d2", color: "white", fontWeight: "bold" }}>Açıklama</TableCell>
              <TableCell sx={{ backgroundColor: "#1976d2", color: "white", fontWeight: "bold" }}>İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredExpenses.map((expense, idx) => {
              const dt = new Date(expense.tarih);
              const saat = dt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false });
              const tarih = dt.toLocaleDateString("tr-TR");
              return (
                <TableRow key={idx}>
                  <TableCell>{saat}</TableCell>
                  <TableCell>{tarih}</TableCell>
                  <TableCell>{expense.tutar} ₺</TableCell>
                  <TableCell>{expense.aciklama}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" size="small" onClick={() => handleEditClick(expense)}> <EditIcon /></Button>
                      <Button variant="outlined" size="small" color="error" onClick={() => handleDelete(expense.id)}> <DeleteIcon /> </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default Giderler;