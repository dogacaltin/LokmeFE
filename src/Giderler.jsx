import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
  CircularProgress, // Yükleme göstergesi
  DialogContentText // Silme onayı metni
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
  const [loading, setLoading] = useState(true); // Yükleniyor durumu
  // --- YENİ: Silme onayı için state'ler ---
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState(null);
  // --- EKLENEN BÖLÜM SONU ---


  const handleUnauthorized = (error) => {
     // Axios hataları genellikle error.response içinde gelir
    const status = error.response ? error.response.status : null;
    if (status === 401) {
      console.warn("Unauthorized (401) detected in Giderler, logging out.");
      localStorage.removeItem("authToken");
      localStorage.removeItem("authTokenTimestamp");
      navigate("/");
    } else {
        console.error("Giderler Error:", error);
        // Genel hata mesajı gösterilebilir
    }
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/");
      return;
    }
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    const fetchExpenses = async () => {
        try {
            const res = await axios.get(`${API_URL}/expenses`, authHeaders);
             if (isMounted) {
                setExpenses(res.data);
             }
        } catch (err) {
             if (isMounted) {
                console.error("Giderler alınamadı:", err);
                handleUnauthorized(err);
             }
        } finally {
             if (isMounted) {
                setLoading(false);
             }
        }
    };
    fetchExpenses();

    return () => { isMounted = false; }; // Cleanup

  }, [API_URL, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewExpense((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async () => {
    const token = localStorage.getItem("authToken");
    const payload = { ...newExpense };
    // Tarihi ISO formatına çevir
    if (payload.tarih) {
        try {
            payload.tarih = new Date(payload.tarih).toISOString();
        } catch (e) {
            console.error("Geçersiz tarih formatı (yeni gider):", payload.tarih);
            return; // Hata göster
        }
    } else {
        console.error("Tarih zorunludur.");
        return; // Hata göster
    }

    try {
        const res = await axios.post(`${API_URL}/expenses`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setExpenses((prev) => [...prev, res.data]);
        setShowForm(false);
        setNewExpense({ tutar: "", aciklama: "", tarih: "" });
    } catch(err) {
        console.error("Gider eklenemedi:", err);
        handleUnauthorized(err);
    }
  };

  // --- GÜNCELLENDİ: handleDelete ---
  // Artık direkt silmek yerine onay dialog'unu açacak
  const handleDelete = (id) => {
    setDeletingExpenseId(id); // Silinecek ID'yi state'e kaydet
    setDeleteConfirmOpen(true); // Onay dialog'unu aç
  };
  // --- GÜNCELLEME SONU ---

  // --- YENİ: confirmDelete fonksiyonu ---
  const confirmDelete = async () => {
    const token = localStorage.getItem("authToken");
    if (!deletingExpenseId) return;

    try {
        await axios.delete(`${API_URL}/expenses/${deletingExpenseId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setExpenses((prev) => prev.filter((e) => e.id !== deletingExpenseId));
        setDeleteConfirmOpen(false);
        setDeletingExpenseId(null);
    } catch(err) {
        console.error("Silme hatası:", err);
        handleUnauthorized(err);
        setDeleteConfirmOpen(false);
        setDeletingExpenseId(null);
    }
  };
  // --- EKLENEN BÖLÜM SONU ---


  const handleEditClick = (expense) => {
    setEditingExpense(expense);
    // Tarihi datetime-local input formatına çevir
    let formattedDate = "";
     if (expense.tarih) {
        try {
            const date = new Date(expense.tarih);
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch (e) {
             console.error("Düzenleme için tarih format hatası (gider):", e);
        }
    }

    setEditForm({
      tutar: expense.tutar || "",
      aciklama: expense.aciklama || "",
      tarih: formattedDate,
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    const token = localStorage.getItem("authToken");
    const payload = { ...editForm };
     // Tarihi ISO formatına çevir
    if (payload.tarih) {
        try {
            payload.tarih = new Date(payload.tarih).toISOString();
        } catch (e) {
            console.error("Geçersiz tarih formatı (gider güncelleme):", payload.tarih);
            return; // Hata göster
        }
    } else {
        console.error("Tarih zorunludur.");
        return; // Hata göster
    }

    try {
        const res = await axios.put(`${API_URL}/expenses/${editingExpense.id}`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setExpenses((prev) =>
          prev.map((exp) => (exp.id === editingExpense.id ? res.data : exp))
        );
        setEditingExpense(null);
    } catch(err) {
        console.error("Güncelleme hatası:", err);
        handleUnauthorized(err);
    }
  };

  const filteredExpenses = !loading ? expenses.filter((exp) => {
    const matchesSearch = [exp.aciklama, exp.tutar?.toString()]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    if (!exp.tarih) {
        return matchesSearch && !dateFrom && !dateTo;
    }
    const date = new Date(exp.tarih);
    const from = dateFrom ? new Date(new Date(dateFrom).setHours(0,0,0,0)) : null;
    const to = dateTo ? new Date(new Date(dateTo).setHours(23,59,59,999)) : null;

    const matchesDate =
      (!from || date >= from) &&
      (!to || date <= to);
    return matchesSearch && matchesDate;
  }) : []; // Yükleniyorsa boş dizi

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authTokenTimestamp");
    navigate("/");
  };

  // Yükleniyor durumu
  if (loading) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Giderler yükleniyor...</Typography>
        </Box>
    );
  }

  return (
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
           <Button variant="contained" color="error" startIcon={<LogoutIcon />} onClick={handleLogout}>
            Çıkış Yap
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} mb={3} alignItems="center">
        <TextField
          label="Ara (Açıklama/Tutar)..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ backgroundColor: theme.palette.mode === "dark" ? "#2c2c2c" : "#f5f5f5", borderRadius: 1, flexGrow: 1 }}
        />
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
         <Stack direction="row" spacing={1} alignItems="center">
          <DatePicker
            label="Başlangıç Tarihi"
            value={dateFrom}
            onChange={(newValue) => setDateFrom(newValue)}
             slotProps={{ textField: { size: 'small' } }}
          />
          <DatePicker
            label="Bitiş Tarihi"
            value={dateTo}
            onChange={(newValue) => setDateTo(newValue)}
             slotProps={{ textField: { size: 'small' } }}
          />
          <Tooltip title="Tarih filtresini temizle">
            <IconButton color="primary" onClick={() => { setDateFrom(null); setDateTo(null); }}>
              <CleaningServicesIcon />
            </IconButton>
          </Tooltip>
          </Stack>
        </LocalizationProvider>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
              setNewExpense({ tutar: "", aciklama: "", tarih: "" }); // Formu temizle
              setEditingExpense(null); // Düzenleme modunda olmadığından emin ol
              setShowForm(true);
          }}
          size="medium"
        >
          GİDER EKLE
        </Button>
      </Stack>

      {/* Yeni Gider Ekleme Formu (Dialog) */}
      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <DialogTitle>Yeni Gider</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField name="tutar" label="Tutar" type="number" value={newExpense.tutar} onChange={handleInputChange} required fullWidth size="small"/>
            <TextField name="aciklama" label="Açıklama" multiline rows={2} value={newExpense.aciklama} onChange={handleInputChange} required fullWidth size="small"/>
            <TextField name="tarih" label="Tarih" type="datetime-local" InputLabelProps={{ shrink: true }} value={newExpense.tarih} onChange={handleInputChange} required fullWidth size="small"/>
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
            <TextField name="tutar" label="Tutar" type="number" value={editForm.tutar} onChange={handleEditChange} required fullWidth size="small"/>
            <TextField name="aciklama" label="Açıklama" multiline rows={2} value={editForm.aciklama} onChange={handleEditChange} required fullWidth size="small"/>
            <TextField name="tarih" label="Tarih" type="datetime-local" InputLabelProps={{ shrink: true }} value={editForm.tarih} onChange={handleEditChange} required fullWidth size="small"/>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingExpense(null)}>İptal</Button>
          <Button variant="contained" onClick={handleEditSave}>Kaydet</Button>
        </DialogActions>
      </Dialog>

       {/* --- YENİ: Silme Onay Dialog'u --- */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="alert-dialog-title-gider"
        aria-describedby="alert-dialog-description-gider"
      >
        <DialogTitle id="alert-dialog-title-gider">
          {"Silme Onayı"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description-gider">
            Bu gideri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>İptal</Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            Sil
          </Button>
        </DialogActions>
      </Dialog>
      {/* --- EKLENEN BÖLÜM SONU --- */}


      {/* Giderler Tablosu */}
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow sx={{"& th": {backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold'}}}>
              <TableCell>Saat</TableCell>
              <TableCell>Tarih</TableCell>
              <TableCell>Tutar</TableCell>
              <TableCell>Açıklama</TableCell>
              <TableCell>İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredExpenses.map((expense) => {
              const dt = expense.tarih ? new Date(expense.tarih) : null;
              const saat = dt ? dt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "N/A";
              const tarih = dt ? dt.toLocaleDateString("tr-TR") : "N/A";
              return (
                <TableRow key={expense.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>{saat}</TableCell>
                  <TableCell>{tarih}</TableCell>
                  <TableCell>{expense.tutar ? `${expense.tutar.toLocaleString('tr-TR')} ₺` : 'N/A'}</TableCell>
                  <TableCell>{expense.aciklama || '-'}</TableCell> {/* Açıklama yoksa '-' göster */}
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                     <Tooltip title="Düzenle">
                      <IconButton size="small" onClick={() => handleEditClick(expense)}> <EditIcon fontSize="small"/></IconButton>
                     </Tooltip>
                     <Tooltip title="Sil">
                      {/* --- GÜNCELLENDİ: handleDelete çağrısı --- */}
                      <IconButton size="small" color="error" onClick={() => handleDelete(expense.id)}> <DeleteIcon fontSize="small"/> </IconButton>
                     </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Giderler;

