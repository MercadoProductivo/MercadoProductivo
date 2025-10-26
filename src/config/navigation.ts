import { FaPlaneDeparture } from "react-icons/fa6";
import { MdHomeWork, MdVerified, MdHome, MdHomeRepairService, MdCreditCard, MdStore } from "react-icons/md";
import { BiSolidMessageSquareDetail } from "react-icons/bi";
import { RiShoppingCart2Fill } from "react-icons/ri";
import { BsFillPersonFill } from "react-icons/bs";
import { MessageSquare, } from "lucide-react";
import type { ComponentType } from "react";

export type NavIcon = ComponentType<{ size?: number | string; className?: string }>;

export type NavItem = {
  label: string;
  href: string;
  icon?: NavIcon;
};

// Navegación principal (top nav / header)
export const MAIN_NAV: NavItem[] = [
  { label: "Productos", href: "/", icon: MdHome },
  { label: "Servicios", href: "/services", icon: MdHomeRepairService },
  { label: "Vendedores", href: "/vendedores", icon: MdStore },
  { label: "Exportadores", href: "/exportadores", icon: FaPlaneDeparture },
  { label: "Planes", href: "/planes", icon: MdCreditCard },
];

// Navegación del dashboard para vendedores
export const DASHBOARD_NAV_SELLER: NavItem[] = [
  { label: "Inicio", href: "/dashboard", icon: MdHomeWork },
  { label: "Mi Plan", href: "/dashboard/plan", icon: MdVerified },
  { label: "Mis productos", href: "/dashboard/products", icon: RiShoppingCart2Fill },
  { label: "Mis servicios", href: "/dashboard/services", icon: RiShoppingCart2Fill },
  { label: "Perfil", href: "/dashboard/profile", icon: BsFillPersonFill },
  { label: "Mensajes", href: "/dashboard/messages", icon: BiSolidMessageSquareDetail },
];

// Navegación del dashboard para compradores
export const DASHBOARD_NAV_BUYER: NavItem[] = [
  { label: "Perfil", href: "/dashboard/profile", icon: BsFillPersonFill },
  { label: "Mensajes", href: "/dashboard/messages", icon: MessageSquare },
];

export function getDashboardNav(isSeller: boolean): NavItem[] {
  return isSeller ? DASHBOARD_NAV_SELLER : DASHBOARD_NAV_BUYER;
}
