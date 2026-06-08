"use client";

import {
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  LoaderCircle,
  type LucideIcon,
  type LucideProps,
  Menu,
  Pencil,
  Play,
  Save,
  Trash2,
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

export function BellIcon(props: SharedIconProps) {
  return <AppIcon icon={Bell} {...props} />;
}

export function CheckIcon(props: SharedIconProps) {
  return <AppIcon icon={Check} {...props} />;
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

export function CircleCheckIcon(props: SharedIconProps) {
  return <AppIcon icon={CircleCheck} {...props} />;
}

export function CircleXIcon(props: SharedIconProps) {
  return <AppIcon icon={CircleX} {...props} />;
}

export function LoaderCircleIcon(props: SharedIconProps) {
  return <AppIcon icon={LoaderCircle} {...props} />;
}

export function MenuIcon(props: SharedIconProps) {
  return <AppIcon icon={Menu} {...props} />;
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

export function TrashIcon(props: SharedIconProps) {
  return <AppIcon icon={Trash2} {...props} />;
}

export function XIcon(props: SharedIconProps) {
  return <AppIcon icon={X} {...props} />;
}
