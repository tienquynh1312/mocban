/**
 * App.tsx — Điều phối chính của ứng dụng Quản lý Dòng họ
 *
 * Cấu trúc file:
 *   src/
 *   ├── context/AppContext.tsx        — Global state (auth, data, actions)
 *   ├── components/
 *   │   ├── ui.tsx                   — UI primitives (Badge, Card, Modal, Btn…)
 *   │   ├── AuthModals.tsx           — LoginModal, RegisterModal
 *   │   ├── Navbar.tsx               — Thanh điều hướng theo vai trò
 *   │   └── RoleSimulator.tsx        — Footer giả lập vai trò (dev/demo)
 *   ├── pages/
 *   │   ├── LandingPage.tsx          — Trang chủ (public)
 *   │   ├── GiaPhaPage.tsx           — Cây gia phả (ADMIN, LEADER, MEMBER, TREASURER)
 *   │   ├── MemberPage.tsx           — Bảng thành viên (ADMIN, LEADER, MEMBER, TREASURER)
 *   │   ├── EventsPage.tsx           — Sự kiện & lịch giỗ (LEADER, MEMBER, TREASURER)
 *   │   ├── FinancePage.tsx          — Quản lý quỹ (LEADER, TREASURER, view: MEMBER)
 *   │   ├── AccountsPage.tsx         — Kiểm toán & tài khoản (ADMIN, LEADER)
 *   │   ├── ProfilePage.tsx          — Tộc ước & hồ sơ dòng họ (public)
 *   │   └── index.tsx                — Page wrappers kết nối context với components
 *   └── data/seedData.ts             — Dữ liệu mẫu khởi tạo
 */
import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import Navbar from "./components/Navbar";
import RoleSimulator from "./components/RoleSimulator";
import { LoginModal, RegisterModal } from "./components/AuthModals";
import LandingPage from "./pages/LandingPage";
import {
  GiaPhaPageWrapper,
  MemberPageWrapper,
  EventsPageWrapper,
  FinancePageWrapper,
  AccountsPageWrapper,
  ProfilePageWrapper,
} from "./pages/index";
import { AccountStatus, UserRole } from "./types";
import { Lock, Shield, Sparkles, UserX, ShieldAlert, Trash2 } from "lucide-react";

// ─── Access Guard ─────────────────────────────────────────────────────────────
function AccessGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, currentAccount, setShowLoginModal, setShowRegisterModal, setActiveTab } = useApp();

  if (!isLoggedIn) {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center max-w-md mx-auto my-16 shadow-sm">
        <Lock className="w-12 h-12 text-[#8c4f2b] mx-auto mb-4 opacity-70" />
        <h3 className="font-serif italic font-bold text-stone-800 text-xl mb-2">Yêu cầu đăng nhập</h3>
        <p className="text-stone-500 text-sm mb-6 leading-relaxed">
          Bạn đang truy cập thông tin nội bộ của dòng tộc. Vui lòng đăng nhập hoặc đăng ký để tiếp tục.
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={() => setShowLoginModal(true)}
            className="bg-[#8c4f2b] text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-[#723e20] cursor-pointer transition-colors">
            Đăng nhập ngay
          </button>
          <button onClick={() => setShowRegisterModal(true)}
            className="border border-stone-200 text-stone-600 px-5 py-2 rounded-lg text-xs font-bold hover:bg-stone-50 cursor-pointer transition-colors">
            Đăng ký mới
          </button>
        </div>
      </div>
    );
  }

  if (currentAccount.status !== AccountStatus.ACTIVE) {
    const statusInfo = {
      [AccountStatus.PENDING_ADMIN]: {
        color: "from-blue-600 to-indigo-600",
        icon: Shield,
        title: "Bước 1/2: Chờ Ban Kỹ Thuật Duyệt",
        desc: "Hồ sơ của bạn đang được xem xét về mặt kỹ thuật. Sau khi duyệt, Trưởng họ sẽ định vị bạn trên gia phả."
      },
      [AccountStatus.PENDING_LEADER]: {
        color: "from-amber-500 to-orange-600",
        icon: Sparkles,
        title: "Bước 2/2: Chờ Trưởng họ Xác nhận",
        desc: "Ban kỹ thuật đã duyệt. Trưởng họ đang xác minh thông tin và định vị bạn vào cây gia phả."
      },
      [AccountStatus.BLOCKED]: {
        color: "from-red-600 to-rose-700",
        icon: UserX,
        title: "Tài khoản bị khóa",
        desc: `Lý do: ${currentAccount.blockReason || "Liên hệ Quản trị viên để biết thêm chi tiết."}`
      },
      [AccountStatus.REJECTED]: {
        color: "from-stone-500 to-stone-700",
        icon: ShieldAlert,
        title: "Tài khoản bị từ chối",
        desc: `Lý do từ chối: ${currentAccount.rejectionReason || "Không đủ điều kiện gia nhập."}`
      },
      [AccountStatus.PENDING_DELETE]: {
        color: "from-orange-500 to-amber-600",
        icon: Trash2,
        title: "Chờ Admin duyệt xóa tài khoản",
        desc: `Yêu cầu xóa tài khoản đang chờ Quản trị viên xử lý.${currentAccount.blockReason ? ` Lý do: ${currentAccount.blockReason}` : ""}`
      },
    };

    const info = statusInfo[currentAccount.status];
    if (!info) return <>{children}</>;
    const Icon = info.icon;

    return (
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm max-w-2xl mx-auto my-12">
        <div className={`p-6 text-white bg-gradient-to-r ${info.color}`}>
          <div className="flex items-center gap-3">
            <Icon className="w-8 h-8 opacity-90" />
            <div>
              <h3 className="font-bold text-lg">{info.title}</h3>
              <p className="text-white/80 text-sm mt-0.5">{info.desc}</p>
            </div>
          </div>
        </div>
        <div className="p-6 text-center">
          <p className="text-stone-500 text-sm mb-4">Bạn chỉ có thể truy cập <strong>Tộc ước</strong> trong thời gian chờ.</p>
          <button onClick={() => setActiveTab("profile")}
            className="bg-stone-100 text-stone-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-stone-200 cursor-pointer transition-colors">
            Xem Tộc ước & Hương ước
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// ─── Main Content Router ──────────────────────────────────────────────────────
function MainContent() {
  const { activeTab, isLoggedIn, currentAccount } = useApp();

  if (activeTab === "landing") return <LandingPage />;
  if (activeTab === "profile") return <ProfilePageWrapper />;

  // Protected routes
  if (activeTab === "giamap") return <AccessGuard><GiaPhaPageWrapper /></AccessGuard>;
  if (activeTab === "member_grid") return <AccessGuard><MemberPageWrapper /></AccessGuard>;
  if (activeTab === "events") return <AccessGuard><EventsPageWrapper /></AccessGuard>;
  if (activeTab === "finance") return <AccessGuard><FinancePageWrapper /></AccessGuard>;
  if (activeTab === "accounts") {
    const canAccess = isLoggedIn &&
      (currentAccount.role === UserRole.ADMIN || currentAccount.role === UserRole.LEADER);
    return canAccess ? <AccountsPageWrapper /> : <AccessGuard><div /></AccessGuard>;
  }

  return <LandingPage />;
}

// ─── App Shell ────────────────────────────────────────────────────────────────
function AppShell() {
  const { showLoginModal, showRegisterModal } = useApp();

  return (
    <div className="min-h-screen bg-stone-50/60">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20">
        <MainContent />
      </main>

      <RoleSimulator />

      {showLoginModal && <LoginModal />}
      {showRegisterModal && <RegisterModal />}
    </div>
  );
}

// ─── Root Export ──────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
