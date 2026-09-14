import {
  Briefcase,
  Calendar,
  CheckSquare,
  Hash,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Users,
  Wallet,
} from "lucide-react";
import type { SidebarSectionDef } from "./types";

/**
 * Contenido de referencia: reproduce el menú de las imágenes de diseño.
 * Dashboard activo con "Main" seleccionado; Messages con badge "4".
 * Es data de demostración — intercambiable por las rutas reales de la app.
 */
export const DEMO_SIDEBAR_SECTIONS: SidebarSectionDef[] = [
  {
    id: "pages",
    title: "Pages",
    groups: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        active: true,
        defaultOpen: true,
        subitems: [
          { id: "main", label: "Main", active: true },
          { id: "analytics", label: "Analytics" },
          { id: "fintech", label: "Fintech" },
        ],
      },
      {
        id: "ecommerce",
        label: "E-Commerce",
        icon: ShoppingBag,
        subitems: [
          { id: "customers", label: "Customers" },
          { id: "orders", label: "Orders" },
          { id: "invoices", label: "Invoices" },
          { id: "shop", label: "Shop" },
          { id: "shop-2", label: "Shop 2" },
          { id: "single-product", label: "Single Product" },
          { id: "cart", label: "Cart" },
          { id: "cart-2", label: "Cart 2" },
          { id: "cart-3", label: "Cart 3" },
          { id: "pay", label: "Pay" },
        ],
      },
      {
        id: "community",
        label: "Community",
        icon: Users,
        subitems: [
          { id: "users-tabs", label: "Users - Tabs" },
          { id: "users-tiles", label: "Users - Tiles" },
          { id: "profile", label: "Profile" },
          { id: "feed", label: "Feed" },
          { id: "forum", label: "Forum" },
          { id: "forum-post", label: "Forum - Post" },
          { id: "meetups", label: "Meetups" },
          { id: "meetups-post", label: "Meetups - Post" },
        ],
      },
      {
        id: "finance",
        label: "Finance",
        icon: Wallet,
        subitems: [
          { id: "cards", label: "Cards" },
          { id: "transactions", label: "Transactions" },
          { id: "transaction-details", label: "Transaction Details" },
        ],
      },
      {
        id: "job-board",
        label: "Job Board",
        icon: Briefcase,
        subitems: [
          { id: "listing", label: "Listing" },
          { id: "job-post", label: "Job Post" },
          { id: "company-profile", label: "Company Profile" },
        ],
      },
      {
        id: "tasks",
        label: "Tasks",
        icon: CheckSquare,
        subitems: [
          { id: "kanban", label: "Kanban" },
          { id: "list", label: "List" },
        ],
      },
      {
        id: "settings",
        label: "Settings",
        icon: Settings,
        subitems: [
          { id: "my-account", label: "My Account" },
          { id: "my-notifications", label: "My Notifications" },
          { id: "connected-apps", label: "Connected Apps" },
          { id: "plans", label: "Plans" },
          { id: "billing-invoices", label: "Billing & Invoices" },
          { id: "give-feedback", label: "Give Feedback" },
        ],
      },
      {
        id: "utility",
        label: "Utility",
        icon: SlidersHorizontal,
        subitems: [
          { id: "changelog", label: "Changelog" },
          { id: "roadmap", label: "Roadmap" },
          { id: "faqs", label: "FAQs" },
          { id: "empty-state", label: "Empty State" },
        ],
      },
    ],
    items: [
      { id: "messages", label: "Messages", icon: MessageSquare, badge: "4" },
      { id: "inbox", label: "Inbox", icon: Inbox },
      { id: "calendar", label: "Calendar", icon: Calendar },
      { id: "campaigns", label: "Campaigns", icon: Hash },
    ],
  },
];
