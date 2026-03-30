import { createBrowserRouter } from "react-router";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Customers from "./pages/Customers";
import Tenders from "./pages/Tenders";
import Alerts from "./pages/Alerts";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: ProtectedRoute,
    children: [
      {
        Component: DashboardLayout,
        children: [
          { index: true, Component: Overview },
          { path: "tenders", Component: Tenders },
          { path: "analytics", Component: Analytics },
          { path: "reports", Component: Reports },
          { path: "customers", Component: Customers },
          { path: "alerts", Component: Alerts },
        ],
      },
    ],
  },
]);
