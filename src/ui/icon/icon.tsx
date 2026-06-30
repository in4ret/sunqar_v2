"use client";

import {
  ArrowDownNarrowWide,
  ArrowUpWideNarrow,
  Bell,
  Bot,
  ChartPie,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleCheck,
  CircleX,
  Database,
  FileText,
  Funnel,
  House,
  LoaderCircle,
  LogOut,
  type LucideIcon,
  type LucideProps,
  Menu,
  Newspaper,
  Pencil,
  Play,
  Save,
  Text,
  Trash2,
  UserRound,
  UserRoundCog,
  Users,
  X,
} from "lucide-react";

type AppIconProps = Omit<LucideProps, "ref"> & {
  icon: LucideIcon;
};

function AppIcon({
  color = "currentColor",
  icon: Icon,
  size = 18,
  strokeWidth = 2,
  ...props
}: AppIconProps) {
  return (
    <Icon
      aria-hidden={props["aria-label"] ? undefined : true}
      color={color}
      focusable="false"
      size={size}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
}

type SharedIconProps = Omit<AppIconProps, "icon">;

export function ArrowDownNarrowWideIcon(props: SharedIconProps) {
  return <AppIcon icon={ArrowDownNarrowWide} {...props} />;
}

export function ArrowUpWideNarrowIcon(props: SharedIconProps) {
  return <AppIcon icon={ArrowUpWideNarrow} {...props} />;
}

export function BellIcon(props: SharedIconProps) {
  return <AppIcon icon={Bell} {...props} />;
}

export function BotIcon(props: SharedIconProps) {
  return <AppIcon icon={Bot} {...props} />;
}

export function CheckIcon(props: SharedIconProps) {
  return <AppIcon icon={Check} {...props} />;
}

export function ChartPieIcon(props: SharedIconProps) {
  return <AppIcon icon={ChartPie} {...props} />;
}

export function ChevronDownIcon(props: SharedIconProps) {
  return <AppIcon icon={ChevronDown} {...props} />;
}

export function ChevronLeftIcon(props: SharedIconProps) {
  return <AppIcon icon={ChevronLeft} {...props} />;
}

export function ChevronRightIcon(props: SharedIconProps) {
  return <AppIcon icon={ChevronRight} {...props} />;
}

export function ChevronsLeftIcon(props: SharedIconProps) {
  return <AppIcon icon={ChevronsLeft} {...props} />;
}

export function ChevronsRightIcon(props: SharedIconProps) {
  return <AppIcon icon={ChevronsRight} {...props} />;
}

export function CircleCheckIcon(props: SharedIconProps) {
  return <AppIcon icon={CircleCheck} {...props} />;
}

export function CircleXIcon(props: SharedIconProps) {
  return <AppIcon icon={CircleX} {...props} />;
}

export function DatabaseIcon(props: SharedIconProps) {
  return <AppIcon icon={Database} {...props} />;
}

export function FileTextIcon(props: SharedIconProps) {
  return <AppIcon icon={FileText} {...props} />;
}

export function FunnelIcon(props: SharedIconProps) {
  return <AppIcon icon={Funnel} {...props} />;
}

export function HouseIcon(props: SharedIconProps) {
  return <AppIcon icon={House} {...props} />;
}

export function LoaderCircleIcon(props: SharedIconProps) {
  return <AppIcon icon={LoaderCircle} {...props} />;
}

export function LogOutIcon(props: SharedIconProps) {
  return <AppIcon icon={LogOut} {...props} />;
}

export function MenuIcon(props: SharedIconProps) {
  return <AppIcon icon={Menu} {...props} />;
}

export function NewspaperIcon(props: SharedIconProps) {
  return <AppIcon icon={Newspaper} {...props} />;
}

export function PencilIcon(props: SharedIconProps) {
  return <AppIcon icon={Pencil} {...props} />;
}

export function PlayIcon(props: SharedIconProps) {
  return <AppIcon icon={Play} {...props} />;
}

export function SaveIcon(props: SharedIconProps) {
  return <AppIcon icon={Save} {...props} />;
}

export function TextIcon(props: SharedIconProps) {
  return <AppIcon icon={Text} {...props} />;
}

export function TrashIcon(props: SharedIconProps) {
  return <AppIcon icon={Trash2} {...props} />;
}

export function UserRoundIcon(props: SharedIconProps) {
  return <AppIcon icon={UserRound} {...props} />;
}

export function UserRoundCogIcon(props: SharedIconProps) {
  return <AppIcon icon={UserRoundCog} {...props} />;
}

export function UsersIcon(props: SharedIconProps) {
  return <AppIcon icon={Users} {...props} />;
}

export function XIcon(props: SharedIconProps) {
  return <AppIcon icon={X} {...props} />;
}
