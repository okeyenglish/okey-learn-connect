/**
 * Centralized icon exports for better tree-shaking
 * Import icons from this file instead of directly from lucide-react
 * This enables better dead code elimination during bundling
 */

// Common icons used across the app
export {
  // Navigation & Actions
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Menu,
  MoreHorizontal,
  MoreVertical,
  X,
  
  // Communication
  MessageCircle,
  MessageSquare,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Send,
  Mail,
  
  // Media
  Image,
  Video,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Camera,
  File,
  FileText,
  Paperclip,
  Download,
  Upload,
  
  // Users & Profiles
  User,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  
  // Status & Indicators
  Check,
  CheckCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  Clock,
  
  // Actions
  Edit,
  Edit2,
  Edit3,
  Trash,
  Trash2,
  Copy,
  Plus,
  Minus,
  Search,
  Filter,
  Settings,
  RefreshCw,
  ExternalLink,
  Link,
  Maximize2,
  Minimize2,
  
  // Organization
  Building,
  Building2,
  Calendar,
  CalendarDays,
  MapPin,
  Briefcase,
  GraduationCap,
  
  // UI Elements
  Star,
  Heart,
  Bookmark,
  Pin,
  Archive,
  Forward,
  Reply,
  
  // Misc
  Bot,
  Zap,
  Bell,
  BellOff,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  
  // Panels
  PanelLeft,
  PanelRight,
  
  // Lists
  ListTodo,
  List,
  
  // Finance
  DollarSign,
  CreditCard,
  
} from 'lucide-react';

// Re-export the type for icon components
export type { LucideIcon } from 'lucide-react';
