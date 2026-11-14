import Home from "./pages/Home";
import Product from "./pages/Product";
import Explore from "./pages/Explore";
import Closet from "./pages/Closet";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Contact from "./pages/Contact";
import Profile from "./pages/Profile";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminStock from "./pages/admin/AdminStock";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminReports from "./pages/admin/AdminReports";
import Login from "./pages/Login";
import { TryOnProvider } from "./pages/Tryon";

import { CartProvider } from "./lib/cart";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const App = () => (
  <CartProvider>
    <TryOnProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<><Home /><Explore /><Contact /></>} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:slug" element={<Shop />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/try-on" element={<Closet />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/account" element={<Profile />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="inventory/stocks" element={<AdminStock />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>

          <Route path="/login" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </TryOnProvider>
  </CartProvider>
);
export default App;