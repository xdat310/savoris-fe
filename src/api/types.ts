// Generated from the backend OpenAPI spec (/v3/api-docs) by scripts/gen-api-types.mjs. Do not edit by hand.

export interface AuditLogResponse {
  id?: number;
  staffId?: number;
  branchId?: number;
  action?: string;
  entityType?: string;
  entityId?: number;
  oldValue?: string;
  newValue?: string;
  createdAt?: string;
}

export interface AddOrderItemsRequest {
  items: OrderItemRequest[];
}

export interface AreaRequest {
  name: string;
}

export interface AreaResponse {
  id?: number;
  branchId?: number;
  name?: string;
}

export interface AssignShiftRequest {
  staffId: number;
  workDate: string;
  note?: string;
}

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  staff?: StaffResponse;
}

export interface AvailabilityRequest {
  available: boolean;
}

export interface BankAccount {
  bank?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface BankAccountRequest {
  bank?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface BankAccountSetting {
  bank?: string;
  accountNumber?: string;
  accountName?: string;
  autoConfirm?: boolean;
  webhookPath?: string;
}

export interface BranchIdsRequest {
  branchIds: number[];
}

export interface BranchLoadResponse {
  branchId?: number;
  pendingPortions?: number;
  cookingPortions?: number;
  kitchenCapacity?: number;
  loadPercent?: number;
  portionsReadyLast30Min?: number;
  estimatedWaitMinutes?: number;
  status?: 'NORMAL' | 'BUSY' | 'OVERLOADED';
  acceptingTakeaway?: boolean;
}

export interface BranchMenuItemResponse {
  menuItemId?: number;
  categoryId?: number;
  code?: string;
  name?: string;
  unit?: string;
  basePrice?: number;
  branchPrice?: number;
  price?: number;
  available?: boolean;
  imageUrl?: string;
  needsKitchen?: boolean;
  outOfStock?: boolean;
}

export interface BranchResponse {
  id?: number;
  code?: string;
  name?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  openTime?: string;
  closeTime?: string;
  managerId?: number;
  kitchenCapacity?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  createdAt?: string;
  updatedAt?: string;
}

export interface BranchSummary {
  branchId?: number;
  code?: string;
  name?: string;
  openOrders?: number;
  completedOrdersToday?: number;
  revenueToday?: number;
  kitchen?: BranchLoadResponse;
}

export interface CancelOrderItemRequest {
  reason?: string;
}

export interface ChainDashboardResponse {
  generatedAt?: string;
  openOrders?: number;
  completedOrdersToday?: number;
  revenueToday?: number;
  overloadedBranches?: number;
  branches?: BranchSummary[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface CreateBranchRequest {
  code: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  openTime?: string;
  closeTime?: string;
  managerId?: number;
}

export interface CreateCustomerRequest {
  fullName: string;
  phone: string;
  email?: string;
  birthDate?: string;
}

export interface CreateIngredientRequest {
  code: string;
  name: string;
  unit: string;
  minStock?: number;
}

export interface CreateMenuCategoryRequest {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateMenuItemRequest {
  code: string;
  name: string;
  description?: string;
  categoryId: number;
  basePrice: number;
  imageUrl?: string;
  unit?: string;
  isActive?: boolean;
  needsKitchen?: boolean;
}

export interface CreateOrderRequest {
  branchId: number;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableId?: number;
  customerId?: number;
  promotionCode?: string;
  pointsToUse?: number;
  notes?: string;
  items: OrderItemRequest[];
}

export interface CreatePaymentRequest {
  orderId: number;
  paymentMethod?: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'E_WALLET';
  cashReceived?: number;
}

export interface CreatePromotionRequest {
  code: string;
  name: string;
  discountType: 'PERCENT' | 'FIXED_AMOUNT';
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  startAt: string;
  endAt: string;
  usageLimit?: number;
  branchIds?: number[];
}

export interface CreatePurchaseOrderRequest {
  branchId: number;
  supplierId: number;
  note?: string;
  items: PurchaseOrderLineRequest[];
}

export interface CreateReservationRequest {
  branchId: number;
  customerId: number;
  reservationDate: string;
  numberOfGuests: number;
  notes?: string;
}

export interface CreateShiftRequest {
  name: string;
  startTime: string;
  endTime: string;
}

export interface CreateStaffRequest {
  code: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'CHEF';
  branchId: number | null;
  hourlyRate: number;
}

export interface CreateSupplierRequest {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
}

export interface CustomerResponse {
  id?: number;
  fullName?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  points?: number;
  totalSpent?: number;
  createdAt?: string;
}

export interface DishBranchResponse {
  branchId?: number;
  code?: string;
  name?: string;
  offered?: boolean;
}

export interface DishExclusionResponse {
  menuItemId?: number;
  branchId?: number;
}

export interface ErrorResponse {
  code?: string;
  message?: string;
  errors?: FieldError[];
  timestamp?: string;
}

export interface FieldError {
  field?: string;
  message?: string;
}

export interface GuestMenuCategory {
  id?: number;
  name?: string;
}

export interface GuestOrderItem {
  itemName?: string;
  quantity?: number;
  amount?: number;
  status?: 'PENDING' | 'COOKING' | 'READY' | 'SERVED' | 'CANCELLED';
  notes?: string;
  imageUrl?: string;
}

export interface GuestOrderResponse {
  code?: string;
  status?: 'AWAITING_PAYMENT' | 'OPEN' | 'COMPLETED' | 'CANCELLED';
  subtotal?: number;
  discountAmount?: number;
  vatAmount?: number;
  totalAmount?: number;
  items?: GuestOrderItem[];
}

export interface GuestTableResponse {
  branchCode?: string;
  branchName?: string;
  branchAddress?: string;
  areaName?: string;
  tableName?: string;
  capacity?: number;
  vatPercent?: number;
  categories?: GuestMenuCategory[];
  menu?: BranchMenuItemResponse[];
}

export interface IngredientResponse {
  id?: number;
  code?: string;
  name?: string;
  unit?: string;
  minStock?: number;
}

export interface InventoryResponse {
  id?: number;
  branchId?: number;
  ingredientId?: number;
  quantity?: number;
  updatedAt?: string;
}

export interface KitchenTicketResponse {
  itemId?: number;
  orderId?: number;
  orderCode?: string;
  orderType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableId?: number;
  menuItemId?: number;
  itemName?: string;
  quantity?: number;
  note?: string;
  status?: 'PENDING' | 'COOKING' | 'VOID_REQUESTED' | 'READY' | 'SERVED' | 'CANCELLED';
  cookedBy?: number;
  orderedAt?: string;
  waitingMinutes?: number;
  voidReason?: string;
  voidResolution?: 'ACCEPT' | 'REMAKE' | 'CHARGE';
}

export interface Line {
  ingredientId: number;
  quantity: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface MenuCategoryResponse {
  id?: number;
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface MenuItemResponse {
  id?: number;
  categoryId?: number;
  code?: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  basePrice?: number;
  unit?: string;
  isActive?: boolean;
  needsKitchen?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItemRequest {
  menuItemId: number;
  quantity: number;
  notes?: string;
}

export interface OrderItemResponse {
  id?: number;
  orderId?: number;
  menuItemId?: number;
  itemName?: string;
  unitPrice?: number;
  quantity?: number;
  amount?: number;
  status?: 'PENDING' | 'COOKING' | 'VOID_REQUESTED' | 'READY' | 'SERVED' | 'CANCELLED';
  notes?: string;
  cancelReason?: string;
  voidReason?: string;
  readyAt?: string;
  orderedByGuest?: boolean;
}

export interface OrderResponse {
  id?: number;
  code?: string;
  branchId?: number;
  tableId?: number;
  customerId?: number;
  staffId?: number;
  orderType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  status?: 'AWAITING_PAYMENT' | 'OPEN' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  subtotal?: number;
  promotionId?: number;
  discountAmount?: number;
  pointsUsed?: number;
  pointsDiscount?: number;
  vatAmount?: number;
  totalAmount?: number;
  createdAt?: string;
  updatedAt?: string;
  items?: OrderItemResponse[];
  guestName?: string;
  guestPhone?: string;
  payMethod?: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'E_WALLET';
  transferClaimedAt?: string;
  refundDueAt?: string;
}

export interface PaymentResponse {
  id?: number;
  orderId?: number;
  amount?: number;
  cashReceived?: number;
  changeAmount?: number;
  method?: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'E_WALLET';
  status?: 'PENDING' | 'PAID' | 'REFUNDED';
  receivedBy?: number;
  paidAt?: string;
  refundedBy?: number;
  refundedAt?: string;
}

export interface PointTransactionResponse {
  id?: number;
  orderId?: number;
  points?: number;
  note?: string;
  createdAt?: string;
}

export interface PriceRequest {
  price?: number;
}

export interface PromotionCheckResponse {
  code?: string;
  name?: string;
  orderAmount?: number;
  discount?: number;
}

export interface PromotionResponse {
  id?: number;
  code?: string;
  name?: string;
  discountType?: 'PERCENT' | 'FIXED_AMOUNT';
  discountValue?: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  startAt?: string;
  endAt?: string;
  usageLimit?: number;
  usedCount?: number;
  isActive?: boolean;
  branchIds?: number[];
}

export interface PublicBranchResponse {
  id?: number;
  code?: string;
  name?: string;
  address?: string;
  acceptingTakeaway?: boolean;
  estimatedWaitMinutes?: number;
  transferAvailable?: boolean;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface PublicMenuDish {
  id?: number;
  categoryId?: number;
  name?: string;
  description?: string;
  imageUrl?: string;
  unit?: string;
  price?: number;
}

export interface PublicMenuResponse {
  categories?: GuestMenuCategory[];
  dishes?: PublicMenuDish[];
  vatPercent?: number;
}

export interface PurchaseOrderLine {
  id?: number;
  ingredientId?: number;
  ingredientName?: string;
  unit?: string;
  quantity?: number;
  receivedQuantity?: number;
  unitPrice?: number;
  amount?: number;
}

export interface PurchaseOrderLineRequest {
  ingredientId: number;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrderResponse {
  id?: number;
  code?: string;
  branchId?: number;
  supplierId?: number;
  status?: 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  totalAmount?: number;
  note?: string;
  createdBy?: number;
  createdAt?: string;
  orderedAt?: string;
  receivedAt?: string;
  items?: PurchaseOrderLine[];
}

export interface PushKey {
  publicKey?: string;
}

export interface PushKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionRequest {
  endpoint: string;
  keys: PushKeys;
}

export interface ReceivePurchaseOrderRequest {
  items?: ReceivedLine[];
}

export interface ReceivedLine {
  itemId: number;
  receivedQuantity: number;
}

export interface RecipeLineResponse {
  ingredientId?: number;
  ingredientName?: string;
  unit?: string;
  quantity?: number;
}

export interface RecipeRequest {
  lines: Line[];
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ReservationResponse {
  id?: number;
  branchId?: number;
  customerId?: number;
  tableId?: number;
  reservationDate?: string;
  numberOfGuests?: number;
  status?: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface Row {
  name: string;
  unit?: string;
  quantity: number;
  minStock?: number;
}

export interface SepayTransaction {
  id?: number;
  gateway?: string;
  accountNumber?: string;
  subAccount?: string;
  content?: string;
  transferType?: string;
  transferAmount?: number;
  referenceCode?: string;
}

export interface ShiftResponse {
  id?: number;
  branchId?: number;
  name?: string;
  startTime?: string;
  endTime?: string;
}

export interface StaffDetailResponse {
  id?: number;
  branchId?: number;
  code?: string;
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  role?: 'ADMIN' | 'MANAGER' | 'STAFF' | 'CHEF';
  status?: 'ACTIVE' | 'LOCKED' | 'ON_LEAVE' | 'RESIGNED';
  hourlyRate?: number;
  hiredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffResponse {
  id?: number;
  branchId?: number;
  branchName?: string;
  code?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  username?: string;
  role?: 'ADMIN' | 'MANAGER' | 'STAFF' | 'CHEF';
  status?: 'ACTIVE' | 'LOCKED' | 'ON_LEAVE' | 'RESIGNED';
  hourlyRate?: number;
  hiredAt?: string;
}

export interface StaffShiftResponse {
  id?: number;
  staffId?: number;
  staffName?: string;
  shiftId?: number;
  shiftName?: string;
  workDate?: string;
  startTime?: string;
  endTime?: string;
  checkInAt?: string;
  checkOutAt?: string;
  workedMinutes?: number;
  note?: string;
}

export interface StockImportRequest {
  rows: Row[];
}

export interface StockImportResponse {
  created?: number;
  updated?: number;
}

export interface SupplierResponse {
  id?: number;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  isActive?: boolean;
}

export interface TableRequest {
  name: string;
  capacity: number;
}

export interface TableResponse {
  id?: number;
  areaId?: number;
  name?: string;
  capacity?: number;
  status?: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
  qrToken?: string;
}

export interface TimesheetResponse {
  staffId?: number;
  staffName?: string;
  role?: 'ADMIN' | 'MANAGER' | 'STAFF' | 'CHEF';
  shiftsWorked?: number;
  shiftsMissed?: number;
  minutesWorked?: number;
  hoursWorked?: number;
  hourlyRate?: number;
  wage?: number;
}

export interface TransferQrSetting {
  url?: string;
}

export interface UpdateBranchRequest {
  name: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  openTime?: string;
  closeTime?: string;
  managerId?: number;
  kitchenCapacity?: number;
}

export interface UpdateInventoryRequest {
  quantity: number;
  notes?: string;
}

export interface UpdateMenuCategoryRequest {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateMenuItemRequest {
  name: string;
  description?: string;
  basePrice?: number;
  imageUrl?: string;
  unit?: string;
  isActive?: boolean;
  needsKitchen?: boolean;
}

export interface UpdateStaffRequest {
  fullName: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'CHEF';
  branchId?: number | null;
  hourlyRate: number;
}

export interface VatSetting {
  percent: number;
}

export interface WebTakeawayRequest {
  branchId: number;
  guestName: string;
  guestPhone: string;
  payMethod: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'E_WALLET';
  notes?: string;
  items: OrderItemRequest[];
}

export interface WebTakeawayResponse {
  token?: string;
  code?: string;
  branchName?: string;
  branchAddress?: string;
  guestName?: string;
  status?: 'AWAITING_PAYMENT' | 'OPEN' | 'COMPLETED' | 'CANCELLED';
  payMethod?: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'E_WALLET';
  paid?: boolean;
  transferQrUrl?: string;
  subtotal?: number;
  vatAmount?: number;
  totalAmount?: number;
  items?: GuestOrderItem[];
  transferClaimed?: boolean;
  cancelReason?: string;
  bankAccount?: BankAccount;
  autoConfirm?: boolean;
}
