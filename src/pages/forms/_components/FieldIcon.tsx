/**
 * FieldIcon — maps each FieldType to a lucide-react icon.
 */
import {
  Type, AlignLeft, FileText, Mail, Phone, Link, Hash, DollarSign, Percent,
  CheckCircle, CheckSquare, ChevronDown, ToggleLeft, Star, List,
  Calendar, Clock, CalendarRange, Upload, PenLine, Heading2, Minus,
  Info, MapPin, User, ThumbsUp, SlidersHorizontal, EyeOff,
} from "lucide-react";
import type { FieldType } from "../_lib/form-schema.ts";
import type { LucideIcon } from "lucide-react";

export const FIELD_ICONS: Record<FieldType, LucideIcon> = {
  short_text: Type,
  long_text: AlignLeft,
  rich_text: FileText,
  email: Mail,
  phone: Phone,
  url: Link,
  number: Hash,
  currency: DollarSign,
  percentage: Percent,
  single_choice: CheckCircle,
  multi_choice: CheckSquare,
  dropdown: ChevronDown,
  boolean: ToggleLeft,
  rating: Star,
  ranking: List,
  date: Calendar,
  time: Clock,
  datetime: Calendar,
  date_range: CalendarRange,
  file_upload: Upload,
  signature: PenLine,
  section_header: Heading2,
  divider: Minus,
  instructions: Info,
  address: MapPin,
  name: User,
  yes_no: ThumbsUp,
  slider: SlidersHorizontal,
  hidden: EyeOff,
};
