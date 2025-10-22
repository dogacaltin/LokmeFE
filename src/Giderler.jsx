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
import axios from "axios"; // Axios kullanmaya devam ediyoruz
import { useNavigate } from "react-router-dom";
import tr from "date-fns/locale/tr";
import ThemeToggle from "./components/ThemeToggle";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
// YENİ: Çıkış ikonu eklendi
import LogoutIcon from '@mui/icons-material/Logout';

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

  // YENİ: Yetkisiz istekleri yakalayan yardımcı fonksiyon
  const handleUnauthorized = (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("authToken");
      navigate("/");
    }
  };

  // 🔄 Giderleri çek (Güvenlik eklendi)
  useEffect(() => {
    // YENİ: Token'ı al ve kontrol et
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/");
      return;
    }
    // YENİ: Axios için standart başlık
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    const fetchExpenses = async () => {
        try {
            // YENİ: İsteklere authHeaders eklendi
            const res = await axios.get(`${API_URL}/expenses`, authHeaders);
            setExpenses(res.data);
        } catch (err) {
            console.error("Giderler alınamadı:", err);
            handleUnauthorized(err); // YENİ: Hata yönetimi
        }
    };
    fetchExpenses();

  }, [API_URL, navigate]); // YENİ: navigate bağımlılıklara eklendi

  // ➕ Yeni gider ekle (Güvenlik eklendi)
  const handleFormSubmit = async () => {
    // YENİ: Token'ı al
    const token = localStorage.getItem("authToken");
    try {
        // YENİ: İsteklere authHeaders eklendi
        const res = await axios.post(`${API_URL}/expenses`, newExpense, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setExpenses((prev) => [...prev, res.data]);
        setShowForm(false);
        setNewExpense({ tutar: "", aciklama: "", tarih: "" });
    } catch(err) {
        console.error("Gider eklenemedi:", err);
        handleUnauthorized(err); // YENİ: Hata yönetimi
    }
  };

  // 🗑️ Gider sil (Güvenlik eklendi)
  const handleDelete = async (id) => {
    // YENİ: Token'ı al
    const token = localStorage.getItem("authToken");
    try {
        // YENİ: İsteklere authHeaders eklendi
        await axios.delete(`${API_URL}/expenses/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch(err) {
        console.error("Silme hatası:", err);
        handleUnauthorized(err); // YENİ: Hata yönetimi
    }
  };

  // 📝 Düzenleme (Fonksiyonlar aynı, sadece handleEditSave'e güvenlik eklendi)
  const handleEditClick = (expense) => {
    setEditingExpense(expense);
    setEditForm({
      tutar: expense.tutar,
      aciklama: expense.aciklama,
      tarih: expense.tarih ? new Date(expense.tarih).toISOString().slice(0, 16) : "", // YENİ: Tarihi input formatına çevir
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    // YENİ: Token'ı al
    const token = localStorage.getItem("authToken");
    try {
        // YENİ: İsteklere authHeaders eklendi
        const res = await axios.put(`${API_URL}/expenses/${editingExpense.id}`, editForm, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setExpenses((prev) =>
          prev.map((exp) => (exp.id === editingExpense.id ? res.data : exp))
        );
        setEditingExpense(null);
    } catch(err) {
        console.error("Güncelleme hatası:", err);
        handleUnauthorized(err); // YENİ: Hata yönetimi
    }
  };

  // Filtreleme mantığı aynı kalıyor
  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch = [exp.aciklama, exp.tutar?.toString()] // Sadece açıklama ve tutarda ara
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    // YENİ: Tarih alanı yoksa filtrelemeyi atla
    if (!exp.tarih) {
        return matchesSearch && !dateFrom && !dateTo; // Tarihsizler sadece tarih filtresi yoksa görünür
    }
    const date = new Date(exp.tarih);
    const from = dateFrom ? new Date(new Date(dateFrom).setHours(0,0,0,0)) : null;
    const to = dateTo ? new Date(new Date(dateTo).setHours(23,59,59,999)) : null;

    const matchesDate =
      (!from || date >= from) &&
      (!to || date <= to);
    return matchesSearch && matchesDate;
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewExpense((prev) => ({ ...prev, [name]: value }));
  };
  
  // YENİ: Çıkış yapma fonksiyonu
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/");
  };


  return (
    // YENİ: Ana container için Box kullanıldı (Home.js'teki gibi)
    <Box sx={{ p: 4, minHeight: "100vh", backgroundColor: theme.palette.background.default }}>
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
          {/* YENİ: Çıkış yap butonu eklendi */}
           <Button variant="contained" color="error" startIcon={<LogoutIcon />} onClick={handleLogout}>
            Çıkış Yap
          </Button>
        </Stack>
      </Stack>

      {/* Arama ve Tarih Filtreleme */}
      <Stack direction="row" spacing={2} mb={3} alignItems="center">
        <TextField
          label="Ara (Açıklama/Tutar)..."
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
          GİDER EKLE
        </Button>
      </Stack>

      {/* Yeni Gider Ekleme Formu (Dialog) */}
      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <DialogTitle>Yeni Gider</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField name="tutar" label="Tutar" type="number" value={newExpense.tutar} onChange={handleInputChange} required/>
            <TextField name="aciklama" label="Açıklama" multiline rows={2} value={newExpense.aciklama} onChange={handleInputChange} required/>
            <TextField name="tarih" label="Tarih" type="datetime-local" InputLabelProps={{ shrink: true }} value={newExpense.tarih} onChange={handleInputChange} required/>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowForm(false)}>İptal</Button>
          <Button variant="contained" onClick={handleFormSubmit}>Kaydet</Button>
        </DialogActions>
      </Dialog>

      {/* Gider Düzenleme Formu (Dialog) */}
      <Dialog open={Boolean(editingExpense)} onClose={() => setEditingExpense(null)}>
        <DialogTitle>Gideri Düzenle</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField name="tutar" label="Tutar" type="number" value={editForm.tutar} onChange={handleEditChange} required/>
            <TextField name="aciklama" label="Açıklama" multiline rows={2} value={editForm.aciklama} onChange={handleEditChange} required/>
            <TextField name="tarih" label="Tarih" type="datetime-local" InputLabelProps={{ shrink: true }} value={editForm.tarih} onChange={handleEditChange} required/>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingExpense(null)}>İptal</Button>
          <Button variant="contained" onClick={handleEditSave}>Kaydet</Button>
        </DialogActions>
      </Dialog>

      {/* Giderler Tablosu */}
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
             {/* YENİ: Başlıklar Home.js ile uyumlu hale getirildi */}
            <TableRow sx={{"& th": {backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold'}}}>
              <TableCell>Saat</TableCell>
              <TableCell>Tarih</TableCell>
              <TableCell>Tutar</TableCell>
              <TableCell>Açıklama</TableCell>
              <TableCell>İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredExpenses.map((expense) => { // YENİ: idx kaldırıldı, key için expense.id kullanıldı
              // YENİ: Tarih objesinin null olup olmadığını kontrol et
              const dt = expense.tarih ? new Date(expense.tarih) : null;
              const saat = dt ? dt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "N/A";
              const tarih = dt ? dt.toLocaleDateString("tr-TR") : "N/A";
              return (
                <TableRow key={expense.id} hover> {/* YENİ: key={expense.id} */}
                  <TableCell>{saat}</TableCell>
                  <TableCell>{tarih}</TableCell>
                  <TableCell>{expense.tutar ? `${expense.tutar.toLocaleString('tr-TR')} ₺` : 'N/A'}</TableCell> {/* YENİ: Formatlama */}
                  <TableCell>{expense.aciklama}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {/* YENİ: IconButton kullanıldı */}
                      <IconButton onClick={() => handleEditClick(expense)}> <EditIcon /></IconButton>
                      <IconButton color="error" onClick={() => handleDelete(expense.id)}> <DeleteIcon /> </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box> // YENİ: </> yerine Box kapatıldı
  );
};

export default Giderler;

