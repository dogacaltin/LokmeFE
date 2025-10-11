import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// ... diğer tüm import'larınızı buraya ekleyin (Box, Button, Typography, vb.)
import { Box, Button, Typography, TextField, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Stack, Dialog, DialogTitle, DialogContent, DialogActions, useTheme } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import BarChartIcon from "@mui/icons-material/BarChart";
import ThemeToggle from "./components/ThemeToggle";
// ... diğer import'larınız ...

export default function Home() {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL;
  // ... diğer tüm state'leriniz (columns, orders, vb.) burada kalacak
  const [columns, setColumns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  // ...

  // --- YENİ EKLENEN BÖLÜM ---
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    // Eğer token yoksa, kullanıcıyı login sayfasına yönlendir.
    if (!token) {
      navigate("/"); // Veya login sayfanızın yolu neyse
      return;
    }

    const fetchHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // Her isteğe token'ı ekle
    };

    const fetchColumnsAndOrders = async () => {
      try {
        const colsRes = await fetch(`${API_URL}/orders/columns`, { headers: fetchHeaders });
        // ... (geri kalan kod aynı)
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


        const ordersRes = await fetch(`${API_URL}/orders`, { headers: fetchHeaders });
        const orderData = await ordersRes.json();
        const sortedOrders = orderData.sort(
          (a, b) => new Date(a.yapilacak_tarih) - new Date(b.yapilacak_tarih)
        );
        setOrders(sortedOrders);
      } catch (err) {
        console.error("Veri çekme hatası:", err);
        // Token geçersizse veya başka bir yetki hatası varsa login'e yönlendir
        if (err.response && err.response.status === 401) {
            localStorage.removeItem("authToken");
            navigate("/");
        }
      }
    };

    fetchColumnsAndOrders();
  }, [navigate, API_URL]); // Bağımlılıklara navigate ve API_URL eklendi

  // Yeni Çıkış Yap fonksiyonu
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/");
  };
  
  // ÖNEMLİ NOT: handleFormSubmit, handleDelete gibi diğer tüm fetch isteklerinize
  // de `{ headers: fetchHeaders }` objesini eklemelisiniz.
  
  // Örnek handleDelete:
  const handleDelete = async (id) => {
    const token = localStorage.getItem("authToken");
    const fetchHeaders = { Authorization: `Bearer ${token}` };
    try {
      await fetch(`${API_URL}/orders/${id}`, { method: "DELETE", headers: fetchHeaders });
      // ... (geri kalan kod aynı)
    } catch(err) {
      //...
    }
  }


  return (
    <Box sx={{ p: 4, minHeight: "100vh" /* ... */ }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">📦 Sipariş Listesi</Typography>
        <Stack direction="row" spacing={1}>
          {/* ... diğer butonlar ... */}
          <Button variant="contained" color="error" onClick={handleLogout}>
            Çıkış Yap
          </Button>
        </Stack>
      </Stack>
      {/* ... sayfanızın geri kalan tüm JSX kodu ... */}
    </Box>
  );
}
