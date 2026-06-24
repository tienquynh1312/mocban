/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from "react";
import { 
  Plus, Edit2, Trash2, Search, Filter, ZoomIn, ZoomOut, RotateCcw, 
  User, CheckCircle, Info, Heart, X, AlertOctagon, UserPlus, Link
} from "lucide-react";
import { ClanMember, Gender, LivingStatus, UserRole, UserAccount, AccountStatus } from "../types";

interface GiaPhaTreeProps {
  members: ClanMember[];
  currentAccount: UserAccount;
  allAccounts: UserAccount[];
  onAddMember: (newMember: Omit<ClanMember, "id">) => void;
  onUpdateMember: (updatedMember: ClanMember) => void;
  onDeleteMember: (id: string, reason: string) => void;
  onLinkAccountToNode: (accountId: string, memberId: string) => void;
}

export default function GiaPhaTree({
  members,
  currentAccount,
  allAccounts,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onLinkAccountToNode,
}: GiaPhaTreeProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ALIVE" | "DECEASED">("ALL");
  const [selectedMember, setSelectedMember] = useState<ClanMember | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Zoom and Pan states
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Admin form modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    gender: Gender.MALE,
    livingStatus: LivingStatus.ALIVE,
    birthDate: "",
    birthDateLunar: "",
    deathDate: "",
    deathDateLunar: "",
    phone: "",
    email: "",
    currentAddress: "",
    originAddress: "Vụ Bản, Nam Định",
    job: "",
    representativeRole: "",
    notes: "",
    parentCoupleId: "", // ID của người đại diện cha (sẽ tính từ m_genX_...)
    fatherId: "",
    motherId: "",
    spouseId: "",
  });

  const [deleteReason, setDeleteReason] = useState("");
  const [deleteId, setDeleteId] = useState("");

  const [linkAccountModal, setLinkAccountModal] = useState(false);
  const [linkAccountId, setLinkAccountId] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState("");

  const isLeader = currentAccount.role === UserRole.LEADER;
  const isAdmin = currentAccount.role === UserRole.ADMIN;

  // 1. CHUẨN BỊ TỌA ĐỘ VẼ CÂY GIA PHẢ CHUYÊN NGHIỆP
  // Chúng ta bố trí theo sơ đồ tĩnh thiết kế hoặc thuật toán phân cấp cây
  const coordinateMap = useMemo(() => {
    // Sắp xếp tọa độ cơ bản hợp lý không đè lên nhau
    const coords: Record<string, { x: number; y: number }> = {
      m_gen1_cao: { x: 420, y: 50 },
      m_gen1_mai: { x: 550, y: 50 },

      m_gen2_thao: { x: 420, y: 190 },
      m_gen2_hien: { x: 550, y: 190 },

      m_gen3_trung: { x: 420, y: 340 },
      m_gen3_lan: { x: 550, y: 340 },

      m_gen4_anhtuan: { x: 300, y: 490 },
      m_gen4_hoang: { x: 600, y: 490 },
    };

    // Tạo tọa độ động cho bất kỳ đinh mới nào được thêm vào
    members.forEach((m) => {
      if (!coords[m.id]) {
        // Tìm cha/mẹ, và xếp gần họ
        if (m.fatherId && coords[m.fatherId]) {
          coords[m.id] = {
            x: coords[m.fatherId].x + (members.length % 2 === 0 ? 80 : -80) + Math.random() * 30,
            y: coords[m.fatherId].y + 150,
          };
        } else if (m.spouseId && coords[m.spouseId]) {
          coords[m.id] = {
            x: coords[m.spouseId].x + 110,
            y: coords[m.spouseId].y,
          };
        } else {
          coords[m.id] = {
            x: 500 + (m.generation * 40),
            y: m.generation * 150 - 100,
          };
        }
      }
    });

    return coords;
  }, [members]);

  // Bộ lọc tìm kiếm thành viên
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch = m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (m.job && m.job.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (m.representativeRole && m.representativeRole.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchGender = genderFilter === "ALL" || m.gender === genderFilter;
      const matchStatus = statusFilter === "ALL" || m.livingStatus === statusFilter;
      return matchSearch && matchGender && matchStatus;
    });
  }, [members, searchTerm, genderFilter, statusFilter]);

  // Nhận diện tài khoản đang chờ map (Luồng R1.3)
  const pendingLeaderAccounts = useMemo(() => {
    return allAccounts.filter(acc => acc.status === AccountStatus.PENDING_LEADER);
  }, [allAccounts]);

  // Hành vi chuột kéo pan và thả
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - panX, y: e.clientY - panY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPanX(e.clientX - dragStart.current.x);
    setPanY(e.clientY - dragStart.current.y);
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanX(0);
    setPanY(0);
  };

  // VẼ ĐƯỜNG LIÊN KẾT GIA ĐÌNH
  const connectionLines = useMemo(() => {
    const lines: React.ReactNode[] = [];

    // Lặp qua các thành viên huyết thống có quan hệ cha-con
    members.forEach((m) => {
      if (m.fatherId && coordinateMap[m.fatherId] && coordinateMap[m.id]) {
        const fatherCoord = coordinateMap[m.fatherId];
        const childCoord = coordinateMap[m.id];
        
        // Vẽ đường huyết thống dọc (rẽ nhánh) từ cha xuống con
        // Phục vụ cho giao diện sơ đồ cây chuẩn Việt Nam (Màu nâu tro thanh nhã)
        lines.push(
          <g key={`blood-${m.fatherId}-${m.id}`}>
            {/* Đường dọc từ cha xuống mid-point */}
            <line
              x1={fatherCoord.x + 35}
              y1={fatherCoord.y + 40}
              x2={fatherCoord.x + 35}
              y2={fatherCoord.y + 90}
              stroke="#8c6c58"
              strokeWidth="1.75"
            />
            {/* Đường ngang cầu nối */}
            <line
              x1={fatherCoord.x + 35}
              y1={fatherCoord.y + 90}
              x2={childCoord.x + 35}
              y2={fatherCoord.y + 90}
              stroke="#8c6c58"
              strokeWidth="1.75"
            />
            {/* Đường dọc từ mid-point vào đỉnh con */}
            <line
              x1={childCoord.x + 35}
              y1={fatherCoord.y + 90}
              x2={childCoord.x + 35}
              y2={childCoord.y}
              stroke="#8c6c58"
              strokeWidth="1.75"
              markerEnd="url(#arrow)"
            />
          </g>
        );
      }

      // Vẽ liên kết vợ chồng bằng nét đứt mờ mịn màng
      if (m.spouseId && coordinateMap[m.spouseId] && coordinateMap[m.id]) {
        const primaryCoord = coordinateMap[m.id];
        const spouseCoord = coordinateMap[m.spouseId];
        
        // Đảm bảo chỉ vẽ 1 đường nối giữa cặp đôi
        if (m.gender === Gender.MALE) {
          lines.push(
            <g key={`spouse-${m.id}-${m.spouseId}`}>
              <line
                x1={primaryCoord.x + 70}
                y1={primaryCoord.y + 20}
                x2={spouseCoord.x}
                y2={spouseCoord.y + 20}
                stroke="#b8ab9f"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              {/* Icon Trái tim liên kết đôi lứa ở giữa cung */}
              <circle
                cx={(primaryCoord.x + 70 + spouseCoord.x) / 2}
                cy={primaryCoord.y + 20}
                r="6"
                fill="#faf6f0"
                stroke="#b8ab9f"
                strokeWidth="1"
              />
            </g>
          );
        }
      }
    });

    return lines;
  }, [members, coordinateMap]);

  // 2. CÁC HÀM XỬ LÝ MẪU (CRUD GIA PHẢ)
  const openAddModal = (parentNodeId?: string) => {
    const parent = members.find(m => m.id === parentNodeId);
    setFormData({
      fullName: "",
      gender: Gender.MALE,
      livingStatus: LivingStatus.ALIVE,
      birthDate: "1990-01-01",
      birthDateLunar: "15/12 Âm lịch",
      deathDate: "",
      deathDateLunar: "",
      phone: "",
      email: "",
      currentAddress: "",
      originAddress: "Vụ Bản, Nam Định",
      job: "",
      representativeRole: "",
      notes: "",
      parentCoupleId: parentNodeId || "",
      fatherId: parent && parent.gender === Gender.MALE ? parent.id : "",
      motherId: parent && parent.gender === Gender.FEMALE ? parent.id : "",
      spouseId: "",
    });
    setShowAddModal(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate logic phả hệ: Ngày sinh con không thể nhỏ hơn cha mẹ (BR từ tài liệu)
    if (formData.fatherId) {
      const father = members.find(m => m.id === formData.fatherId);
      if (father && formData.birthDate && father.birthDate > formData.birthDate) {
        alert("Lỗi logic phả hệ: Ngày sinh của con không thể nhỏ hơn ngày sinh của cha mẹ!");
        return;
      }
    }

    onAddMember({
      fullName: formData.fullName,
      gender: formData.gender,
      livingStatus: formData.livingStatus,
      birthDate: formData.birthDate,
      birthDateLunar: formData.birthDateLunar || undefined,
      deathDate: formData.livingStatus === LivingStatus.DECEASED ? formData.deathDate : undefined,
      deathDateLunar: formData.livingStatus === LivingStatus.DECEASED ? formData.deathDateLunar : undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      currentAddress: formData.currentAddress || undefined,
      originAddress: formData.originAddress || undefined,
      generation: formData.parentCoupleId ? (members.find(m => m.id === formData.parentCoupleId)?.generation || 3) + 1 : 4,
      fatherId: formData.fatherId || undefined,
      motherId: formData.motherId || undefined,
      spouseId: formData.spouseId || undefined,
      job: formData.job || undefined,
      representativeRole: formData.representativeRole || undefined,
      notes: formData.notes || undefined,
    });

    // Liên kết tài khoản nếu đã chọn
    if (linkedAccountId) {
      setTimeout(() => {
        const newMember = members[members.length - 1];
        if (newMember) onLinkAccountToNode(linkedAccountId, newMember.id);
        setLinkedAccountId("");
      }, 500);
    }

    setShowAddModal(false);
  };

  const openEditModal = (member: ClanMember) => {
    setSelectedMember(member);
    setFormData({
      fullName: member.fullName,
      gender: member.gender,
      livingStatus: member.livingStatus,
      birthDate: member.birthDate,
      birthDateLunar: member.birthDateLunar || "",
      deathDate: member.deathDate || "",
      deathDateLunar: member.deathDateLunar || "",
      phone: member.phone || "",
      email: member.email || "",
      currentAddress: member.currentAddress || "",
      originAddress: member.originAddress || "Vụ Bản, Nam Định",
      job: member.job || "",
      representativeRole: member.representativeRole || "",
      notes: member.notes || "",
      parentCoupleId: member.fatherId || "",
      fatherId: member.fatherId || "",
      motherId: member.motherId || "",
      spouseId: member.spouseId || "",
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    onUpdateMember({
      ...selectedMember,
      fullName: formData.fullName,
      gender: formData.gender,
      livingStatus: formData.livingStatus,
      birthDate: formData.birthDate,
      birthDateLunar: formData.birthDateLunar || undefined,
      deathDate: formData.livingStatus === LivingStatus.DECEASED ? formData.deathDate : undefined,
      deathDateLunar: formData.livingStatus === LivingStatus.DECEASED ? formData.deathDateLunar : undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      currentAddress: formData.currentAddress || undefined,
      originAddress: formData.originAddress || undefined,
      fatherId: formData.fatherId || undefined,
      motherId: formData.motherId || undefined,
      spouseId: formData.spouseId || undefined,
      job: formData.job || undefined,
      representativeRole: formData.representativeRole || undefined,
      notes: formData.notes || undefined,
    });

    setShowEditModal(false);
    setSelectedMember(null);
  };

  const openDeleteModal = (id: string, name: string) => {
    // Kiểm tra ràng buộc phả hệ trước khi xóa (BR2: Tuyệt đối không xóa nếu có con cháu trực thuộc)
    const hasChildren = members.some(m => m.fatherId === id || m.motherId === id);
    if (hasChildren) {
      alert(`Không thể xóa! Thành viên [${name}] đang có dữ liệu con/cháu trực hệ trong gia phả. Vui lòng di chuyển hoặc xóa các thành viên con cháu trước.`);
      return;
    }

    setDeleteId(id);
    setDeleteReason("");
    setShowDeleteModal(true);
  };

  const handleDeleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteReason) {
      alert("Lý do xóa là bắt buộc để đối soát gia đình sau này!");
      return;
    }
    onDeleteMember(deleteId, deleteReason);
    setShowDeleteModal(false);
    setSelectedMember(null);
  };

  const handleLinkAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkAccountId || !selectedMember) return;
    onLinkAccountToNode(linkAccountId, selectedMember.id);
    setLinkAccountModal(false);
    
    // Tự động gán thông tin tài khoản cho nút thành viên
    const targetAcc = allAccounts.find(a => a.id === linkAccountId);
    if (targetAcc) {
      onUpdateMember({
        ...selectedMember,
        phone: targetAcc.phone,
        email: targetAcc.email,
        notes: `Gia phả đã liên kết với tài khoản hệ thống của ${targetAcc.fullName}.`
      });
    }
  };

  // Tra cứu tài khoản đang liên kết với Node
  const getLinkedAccount = (mId: string) => {
    return allAccounts.find(acc => acc.mappedMemberId === mId);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 2.1 HEADER TITLE PANEL & TOOLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-stone-200 pb-5">
        <div>
          <h2 className="font-serif italic text-3xl font-bold text-stone-900 tracking-tight">Sơ đồ gia tộc</h2>
          <p className="text-[10px] tracking-wider text-stone-400 font-sans font-bold uppercase mt-1">BẢN ĐỒ KẾT NỐI 18 THẾ HỆ NGUYỄN TỘC</p>
        </div>
        
        {/* Right Controls: add member, search, filters button */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          {/* Search Input Custom pill design */}
          <div className="relative w-full sm:w-64 max-w-full">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-stone-400" />
            <input
              id="input-search-member"
              type="text"
              placeholder="Tìm tên tộc viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2.5 text-xs bg-stone-100/70 border border-stone-200 hover:bg-stone-50 focus:bg-white rounded-full focus:outline-none transition-all placeholder:text-stone-400 text-stone-800 font-medium"
            />
          </div>

          {/* Filter Toggle circle button */}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
              showFilters || genderFilter !== "ALL" || statusFilter !== "ALL"
                ? "border-[#8c4f2b] bg-amber-50/50 text-[#8c4f2b]" 
                : "border-stone-200 hover:bg-stone-50 text-stone-600 bg-white"
            }`}
            title="Bộ lọc nâng cao"
          >
            <Filter className="w-4 h-4" />
          </button>

          {/* Zoom state floating panel inside header */}
          <div className="flex items-center gap-0.5 border border-stone-200/80 bg-white px-2.5 py-1.5 rounded-full text-stone-700 text-xs shadow-custom shadow-stone-100/10">
            <button
              id="btn-tree-zoom-out"
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.1, 0.5))}
              className="p-1 text-stone-500 hover:text-[#8c4f2b] transition-colors cursor-pointer"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono text-stone-600 px-2 font-bold border-x border-stone-100">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              id="btn-tree-zoom-in"
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 1.8))}
              className="p-1 text-stone-500 hover:text-[#8c4f2b] transition-colors cursor-pointer"
              title="Phóng to"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              id="btn-tree-zoom-reset"
              onClick={handleResetZoom}
              className="p-1 text-stone-400 hover:text-[#8c4f2b] transition-colors cursor-pointer"
              title="Đặt lại"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Solid warm brown button for adding, visible if leader or treasurer or admin */}
          {(isAdmin || isLeader) && (
            <button
              id="btn-add-primary-member"
              onClick={() => setShowAddModal(true)}
              className="bg-[#8c4f2b] hover:bg-[#723e20] text-stone-50 px-4 py-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-sm ml-auto sm:ml-0"
            >
              + Thêm người mới
            </button>
          )}
        </div>
      </div>

      {/* COLLAPSIBLE FILTER WORKSPACE PANEL */}
      {showFilters && (
        <div className="bg-stone-50/60 border border-stone-200/50 rounded-2xl p-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-semibold font-sans">Giới tính:</span>
            <select
              id="select-gender-filter"
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as any)}
              className="text-xs font-sans bg-white border border-stone-200 hover:border-stone-300 px-3 py-1.5 rounded-lg outline-none text-stone-700 cursor-pointer"
            >
              <option value="ALL">Tất cả giới tính</option>
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-semibold font-sans">Trạng thái:</span>
            <select
              id="select-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs font-sans bg-white border border-stone-200 hover:border-stone-300 px-3 py-1.5 rounded-lg outline-none text-stone-700 cursor-pointer"
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="ALIVE">Còn sống</option>
              <option value="DECEASED">Đã khuất</option>
            </select>
          </div>
          
          <button 
            onClick={() => { setGenderFilter("ALL"); setStatusFilter("ALL"); setSearchTerm(""); }}
            className="text-[11px] text-[#8c4f2b] hover:underline font-bold font-sans ml-auto transition-colors cursor-pointer"
          >
            Mặc định lại bộ lọc
          </button>
        </div>
      )}

      {/* THÔNG BÁO CHO TRƯỞNG HỌ VỀ THÀNH VIÊN ĐANG CHỜ MAP CẬP NHẬT */}
      {isLeader && pendingLeaderAccounts.length > 0 && (
        <div id="leader-pending-notice" className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <div className="flex gap-2">
            <AlertOctagon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-sans font-semibold text-amber-900 text-sm">YÊU CẦU LIÊN KẾT GIA PHẢ MỚI ({pendingLeaderAccounts.length})</h4>
              <p className="text-xs text-amber-700/90 font-sans mt-0.5">Có tài khoản đã duyệt hồ sơ kỹ thuật, đang chờ bạn ánh xạ vào sơ đồ (Node) gia phả thích hợp và bổ nhiệm chức vụ.</p>
            </div>
          </div>
          <p className="text-xs text-stone-500 bg-white border border-amber-200/50 rounded-lg p-2 md:self-center font-sans shadow-sm">
            Mẹo: Click vào thành viên bất kỳ &gt; Chọn <strong>Liên kết tài khoản dòng họ</strong>.
          </p>
        </div>
      )}

      {/* SƠ ĐỒ CÂY TƯƠNG TÁC CHÍNH (CANVAS VIEW) */}
      <div className="flex flex-col xl:flex-row gap-6">
        <div 
          id="tree-viewport-container"
          className="flex-1 min-h-[580px] bg-[radial-gradient(#e5e2db_1px,transparent_1px)] [background-size:24px_24px] bg-[#fdfdfc] border border-stone-200 rounded-2xl relative overflow-hidden select-none cursor-grab shadow-sm"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
        >
          {/* Header chỉ dẫn trên canvas */}
          <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-stone-200 shadow-custom shadow-stone-100/20 pointer-events-none">
            <h5 className="text-[10px] uppercase font-bold tracking-wider text-stone-400 font-sans">Bản đồ Gia Phả Hệ</h5>
            <p className="text-[9px] text-stone-500 mt-0.5">Kéo thả chuột để di chuyển • Cuộn để phóng dốc</p>
          </div>

          <div className="absolute top-4 right-4 z-10 flex flex-wrap gap-2 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/85 border border-stone-200 text-[10px] font-sans font-bold text-stone-600">
              <span className="w-2 h-2 rounded-full bg-[#8c4f2b]"></span> Đinh Nam (Viền nâu)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/85 border border-stone-200 text-[10px] font-sans font-bold text-stone-600">
              <span className="w-2 h-2 rounded-full bg-[#f2cfb8]"></span> Con Gái/Vợ (Viền Đào)
            </span>
          </div>

          {/* VIEWPORT SVG CHÍNH */}
          <div 
            id="tree-svg-viewport"
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
              transformOrigin: "center center",
              transition: isDragging.current ? "none" : "transform 0.15s ease-out"
            }}
            className="w-full h-full min-h-[580px] origin-center"
          >
            <svg className="absolute inset-0 w-[1250px] h-[600px] overflow-visible">
              <defs>
                {/* Mũi tên chỉ huyết hệ */}
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="5"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#8c6c58" />
                </marker>
              </defs>

              {/* Vẽ đường liên kết */}
              {connectionLines}

              {/* Vẽ các Thẻ Thành Viên (HTML overlay hoặc SVG group g) */}
              {members.map((m) => {
                const coord = coordinateMap[m.id];
                if (!coord) return null;

                const isSelected = selectedMember?.id === m.id;
                const isDeceased = m.livingStatus === LivingStatus.DECEASED;
                const isMale = m.gender === Gender.MALE;
                const hasAccountLinked = getLinkedAccount(m.id);

                // Highlight tìm kiếm trùng khớp
                const isSearched = searchTerm !== "" && (
                  m.fullName.toLowerCase().includes(searchTerm.toLowerCase())
                );

                return (
                  <g key={m.id}>
                    <foreignObject
                      x={coord.x}
                      y={coord.y}
                      width="120"
                      height="75"
                      className="overflow-visible"
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMember(m);
                        }}
                        className={`w-[110px] h-[65px] rounded-xl p-2 flex flex-col justify-between text-left cursor-pointer transition-all border ${
                          isSelected 
                            ? "bg-[#faf6f2] border-[#8c4f2b] ring-3 ring-[#8c4f2b]/20 scale-105 shadow-md" 
                            : isDeceased
                              ? "bg-stone-50/60 border-stone-200 text-stone-400 opacity-65"
                              : isMale
                                ? "bg-white border-2 border-[#8c4f2b] hover:bg-stone-50 shadow-xs"
                                : "bg-white border-2 border-[#f2cfb8] hover:bg-stone-50 shadow-xs"
                        } ${isSearched ? "ring-2 ring-amber-500 animate-pulse" : ""}`}
                      >
                        {/* Thế hệ thứ & Chức danh đại diện */}
                        <div className="flex items-center justify-between text-[8px] font-sans">
                          <span className={`${isDeceased ? "text-stone-400" : "text-[#8c4f2b]"} font-bold`}>
                            Đời thứ {m.generation}
                          </span>
                          {hasAccountLinked && (
                            <span className="w-1.5 h-1.5 bg-[#8c4f2b] rounded-full" title="Tài khoản hoạt động"></span>
                          )}
                        </div>

                        {/* Tên thành viên */}
                        <h4 className={`text-[10px] font-serif font-bold leading-tight truncate ${
                          isDeceased ? "text-stone-400 line-through font-normal" : "text-stone-800"
                        }`}>
                          {m.fullName}
                        </h4>

                        {/* Vai trò / Tộc vị / Chức quan */}
                        <div className={`text-[8px] font-sans font-bold leading-none uppercase tracking-wide truncate ${isDeceased ? "text-stone-400" : "text-stone-500"}`}>
                          {m.representativeRole || m.job || (isDeceased ? "Cố hương" : "Hậu sinh")}
                        </div>

                        {/* Đã khuất ghi chú ngày giỗ Âm lịch nhỏ dòng cuối */}
                        {isDeceased && m.deathDateLunar && (
                          <div className="text-[7px] text-[#8c4f2b]/85 font-mono italic">
                            Giỗ: {m.deathDateLunar}
                          </div>
                        )}
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* 2.2 BẢNG THÔNG TIN CHI TIẾT THÀNH VIÊN (DRAWER/DETAIL PANEL) */}
        <div id="tree-detail-drawer" className="w-full xl:w-96 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
          {selectedMember ? (
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="flex justify-between items-start pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2.5">
                    <span className={`p-2.5 rounded-xl text-white ${
                      selectedMember.gender === Gender.MALE ? "bg-[#8c4f2b]" : "bg-[#f2cfb8]"
                    }`}>
                      <User className="w-5 h-5 text-white" />
                    </span>
                    <div>
                      <h3 className="font-serif font-bold text-stone-900 text-sm">{selectedMember.fullName}</h3>
                      <p className="text-[10px] text-stone-400 font-sans font-bold uppercase tracking-wider">
                        Thế hệ đời thứ {selectedMember.generation} • {selectedMember.gender === Gender.MALE ? "Đinh Nam" : "Con gái / Phụ mẫu"}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedMember(null)} className="p-1 hover:bg-stone-100 rounded transition-colors cursor-pointer">
                    <X className="w-4 h-4 text-stone-400" />
                  </button>
                </div>

                {/* THÔNG TIN CHI TIẾT */}
                <div className="py-4 flex flex-col gap-3 text-xs leading-relaxed text-slate-700">
                  <div className="grid grid-cols-3 gap-1 pt-1 border-b border-slate-50">
                    <span className="text-slate-400 font-sans">Trạng thái:</span>
                    <span className="col-span-2 font-sans font-semibold">
                      {selectedMember.livingStatus === LivingStatus.ALIVE ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Còn sống</span>
                      ) : (
                        <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">Đã khuất</span>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-1 border-b border-slate-50">
                    <span className="text-slate-400 font-sans">Ngày sinh:</span>
                    <span className="col-span-2 font-sans font-medium">
                      {selectedMember.birthDate} {selectedMember.birthDateLunar && `(Âm lịch: ${selectedMember.birthDateLunar})`}
                    </span>
                  </div>

                  {selectedMember.livingStatus === LivingStatus.DECEASED && (
                    <>
                      <div className="grid grid-cols-3 gap-1 pt-1 border-b border-slate-50">
                        <span className="text-slate-400 font-sans">Lễ Giỗ tổ/mất:</span>
                        <span className="col-span-2 font-sans font-medium text-rose-700">
                          {selectedMember.deathDate} {selectedMember.deathDateLunar && `(Âm kỵ: ${selectedMember.deathDateLunar})`}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-3 gap-1 pt-1 border-b border-slate-50">
                    <span className="text-slate-400 font-sans">Địa chỉ hiên nay:</span>
                    <span className="col-span-2 font-sans">{selectedMember.currentAddress || "Chưa cập nhật"}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-1 border-b border-slate-50">
                    <span className="text-slate-400 font-sans">Nghề nghiệp:</span>
                    <span className="col-span-2 font-sans font-medium">{selectedMember.job || "Chưa rõ"}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-1 border-b border-slate-50">
                    <span className="text-slate-400 font-sans">Nhiệm vụ tộc:</span>
                    <span className="col-span-2 text-amber-700 font-sans font-bold">{selectedMember.representativeRole || "Thành viên gia đình"}</span>
                  </div>

                  {/* Quan hệ bố mẹ / vợ chồng hiển thị chi tiết tên */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-2 flex flex-col gap-1.5">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Mối quan hệ huyết thống</div>
                    {selectedMember.fatherId && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cha:</span>
                        <span className="font-medium text-slate-800">{members.find(m => m.id === selectedMember.fatherId)?.fullName}</span>
                      </div>
                    )}
                    {selectedMember.spouseId && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Bạn đời:</span>
                        <span className="font-medium text-rose-800">{members.find(m => m.id === selectedMember.spouseId)?.fullName}</span>
                      </div>
                    )}
                  </div>

                  {/* Tài khoản liên kết hệ thống */}
                  <div className="py-2">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Liên kết tài khoản ứng dụng</div>
                    {getLinkedAccount(selectedMember.id) ? (
                      <div className="p-2 border border-emerald-200 bg-emerald-50/50 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Đã liên kết với tài khoản <strong>{getLinkedAccount(selectedMember.id)?.fullName}</strong></span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 border border-slate-100 bg-slate-50 rounded-lg text-[10px] text-slate-500">
                        Chưa có tài khoản ứng dụng nào ánh xạ vào vị trí rẽ nhánh này.
                      </div>
                    )}
                  </div>

                  {selectedMember.notes && (
                    <div className="bg-amber-50 p-2.5 rounded-lg text-amber-900 border border-amber-100 italic">
                      Ghi chú: {selectedMember.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* HÀNH ĐỘNG HỖ TRỢ TRƯỞNG HỌ / ADMIN */}
              {isLeader && (
                <div className="pt-4 border-t border-rose-100 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="btn-tree-edit-member"
                      onClick={() => openEditModal(selectedMember)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa
                    </button>
                    <button
                      id="btn-tree-delete-member"
                      onClick={() => openDeleteModal(selectedMember.id, selectedMember.fullName)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa vị trí
                    </button>
                  </div>

                  <button
                    id="btn-tree-add-child"
                    onClick={() => openAddModal(selectedMember.id)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Thêm Con / Chi mới xuống dưới
                  </button>

                  {!getLinkedAccount(selectedMember.id) && pendingLeaderAccounts.length > 0 && (
                    <button
                      id="btn-tree-link-account"
                      onClick={() => {
                        setLinkAccountId(pendingLeaderAccounts[0].id);
                        setLinkAccountModal(true);
                      }}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer"
                    >
                      <Link className="w-4 h-4" /> Liên kết Đinh nam ứng dụng
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div id="tree-no-selected-member" className="flex flex-col items-center justify-center text-center py-12 text-slate-400">
              <span className="p-3 bg-rose-50 text-rose-500 rounded-2xl mb-3">
                <Info className="w-6 h-6 animate-pulse" />
              </span>
              <h4 className="font-sans font-semibold text-slate-700 text-sm">Hồ sơ chi tiết</h4>
              <p className="text-xs text-slate-500 font-sans max-w-[240px] mt-1.5">
                Nhấp chuột vào bất cứ Thẻ thành viên nào trên sơ đồ gia phả để đọc thông tin lai lịch, liên kết cha mẹ, ngày mất Âm lịch và tài khoản hệ thống.
              </p>
              {isLeader && (
                <div className="mt-6 w-full">
                  <button
                    id="btn-tree-add-root"
                    onClick={() => openAddModal()}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Tạo thành viên gốc (Cụ Tổ)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2.3 MODAL THÊM MỚI THÀNH VIÊN (ADD MEMBER DIALOG) */}
      {showAddModal && (
        <div id="modal-tree-add-member" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border rounded-2xl p-6 shadow-2xl w-full max-w-lg mt-8 mb-8">
            <div className="flex justify-between items-center pb-3 border-b mb-4">
              <h3 className="font-sans font-semibold text-slate-900 text-base">Thêm thành viên vào gia phả</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-4 text-xs font-sans">
              {/* Dropdown chọn tài khoản đã được duyệt */}
              {allAccounts.filter(a => a.status === AccountStatus.ACTIVE && a.role !== "ADMIN" && !a.mappedMemberId).length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <label className="block text-xs font-bold text-blue-800 mb-1.5">
                    🔗 Liên kết từ tài khoản đã duyệt (tự điền thông tin)
                  </label>
                  <select
                    onChange={e => {
                      const accId = e.target.value;
                      if (!accId) return;
                      const acc = allAccounts.find(a => a.id === accId);
                      if (acc) {
                        setFormData(f => ({
                          ...f,
                          fullName: acc.fullName,
                          birthDate: acc.birthDate ? acc.birthDate.split("T")[0] : f.birthDate,
                          gender: (acc.gender as Gender) || Gender.MALE,
                          currentAddress: acc.address || "",
                          originAddress: acc.hometown || "",
                          notes: acc.notes || "",
                        }));
                        setLinkedAccountId(accId);
                      }
                    }}
                    className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                    defaultValue=""
                  >
                    <option value="">-- Chọn tài khoản để tự điền thông tin --</option>
                    {allAccounts
                      .filter(a => a.status === AccountStatus.ACTIVE && a.role !== "ADMIN" && !a.mappedMemberId)
                      .map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.fullName} · {acc.phone} · {acc.role}
                        </option>
                      ))
                    }
                  </select>
                  <p className="text-[10px] text-blue-600 mt-1">Chọn tài khoản sẽ tự điền thông tin vào form bên dưới</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Bá Vương"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Giới tính</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                    className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-rose-500"
                  >
                    <option value={Gender.MALE}>Nam (Đinh nam thâu tóm phả)</option>
                    <option value={Gender.FEMALE}>Nữ / Con dâu gả</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Trạng thái sống</label>
                  <select
                    value={formData.livingStatus}
                    onChange={(e) => setFormData({ ...formData, livingStatus: e.target.value as LivingStatus })}
                    className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-rose-500"
                  >
                    <option value={LivingStatus.ALIVE}>Còn sống</option>
                    <option value={LivingStatus.DECEASED}>Đã khuất</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Từ đường gốc / Quê quán</label>
                  <input
                    type="text"
                    value={formData.originAddress}
                    onChange={(e) => setFormData({ ...formData, originAddress: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Ngày sinh Dương lịch *</label>
                  <input
                    type="date"
                    required
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Ngày sinh Âm lịch (Ghi chú nếu rõ)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 15/08 Âm lịch"
                    value={formData.birthDateLunar}
                    onChange={(e) => setFormData({ ...formData, birthDateLunar: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-slate-50"
                  />
                </div>
              </div>

              {formData.livingStatus === LivingStatus.DECEASED && (
                <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-50 rounded-lg border">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Ngày mất Dương lịch</label>
                    <input
                      type="date"
                      value={formData.deathDate}
                      onChange={(e) => setFormData({ ...formData, deathDate: e.target.value })}
                      className="w-full border rounded-lg p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Ngày giỗ Âm lịch *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: 15/03 (Để hệ thống tự tạo lịch lễ giỗ)"
                      value={formData.deathDateLunar}
                      onChange={(e) => setFormData({ ...formData, deathDateLunar: e.target.value })}
                      className="w-full border rounded-lg p-2 bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Nhiệm vụ tông (Chức vụ dòng họ)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Chi trưởng chi 1, Thư ký..."
                    value={formData.representativeRole}
                    onChange={(e) => setFormData({ ...formData, representativeRole: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Bố liên kết trong phả (Cha)</label>
                  <select
                    value={formData.fatherId}
                    onChange={(e) => setFormData({ ...formData, fatherId: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-slate-50"
                  >
                    <option value="">Không có / Thủy tổ dòng họ</option>
                    {members.filter(m => m.gender === Gender.MALE).map(m => (
                      <option key={m.id} value={m.id}>Đời {m.generation} - {m.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Mẹ liên kết trong phả</label>
                  <select
                    value={formData.motherId}
                    onChange={(e) => setFormData({ ...formData, motherId: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-slate-50"
                  >
                    <option value="">Không rõ hoặc dâu ngoài</option>
                    {members.filter(m => m.gender === Gender.FEMALE).map(m => (
                      <option key={m.id} value={m.id}>Đời {m.generation} - {m.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Vợ/Chồng liên kết (Nút kề cạnh)</label>
                  <select
                    value={formData.spouseId}
                    onChange={(e) => setFormData({ ...formData, spouseId: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-slate-50"
                  >
                    <option value="">Chưa có vợ/chồng trên cây</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>Đời {m.generation} - {m.fullName} ({m.gender === Gender.MALE ? "Nam" : "Nữ"})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Nghề nghiệp hiện thời</label>
                  <input
                    type="text"
                    value={formData.job}
                    onChange={(e) => setFormData({ ...formData, job: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Ghi chú lai lịch</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-slate-50 h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  id="btn-submit-tree-add"
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg cursor-pointer"
                >
                  Ghi lại và vẽ phả
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2.4 MODAL CHỈNH SỬA THÀNH VIÊN (EDIT MEMBER DIALOG) */}
      {showEditModal && selectedMember && (
        <div id="modal-tree-edit-member" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border rounded-2xl p-6 shadow-2xl w-full max-w-lg mt-8 mb-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b mb-4">
              <h3 className="font-sans font-semibold text-slate-900 text-base">Cập nhật thông tin gia phả hẹp</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Giới tính</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                    className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-rose-500"
                  >
                    <option value={Gender.MALE}>Nam</option>
                    <option value={Gender.FEMALE}>Nữ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Trạng thái sinh hoạt</label>
                  <select
                    value={formData.livingStatus}
                    onChange={(e) => setFormData({ ...formData, livingStatus: e.target.value as LivingStatus })}
                    className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-rose-500"
                  >
                    <option value={LivingStatus.ALIVE}>Còn sống</option>
                    <option value={LivingStatus.DECEASED}>Đã khuất</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Quê quán cổ tích</label>
                  <input
                    type="text"
                    value={formData.originAddress}
                    onChange={(e) => setFormData({ ...formData, originAddress: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Ngày sinh Dương lịch *</label>
                  <input
                    type="date"
                    required
                    value={formData.birthDate || ""}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Ngày sinh Âm lịch</label>
                  <input
                    type="text"
                    value={formData.birthDateLunar}
                    onChange={(e) => setFormData({ ...formData, birthDateLunar: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-rose-500"
                  />
                </div>
              </div>

              {formData.livingStatus === LivingStatus.DECEASED && (
                <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-50 rounded-lg border">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Ngày mất Dương lịch</label>
                    <input
                      type="date"
                      value={formData.deathDate || ""}
                      onChange={(e) => setFormData({ ...formData, deathDate: e.target.value })}
                      className="w-full border rounded-lg p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Giỗ chạp hằng năm Âm lịch *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: 12/03"
                      value={formData.deathDateLunar || ""}
                      onChange={(e) => setFormData({ ...formData, deathDateLunar: e.target.value })}
                      className="w-full border rounded-lg p-2 bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Số điện thoại liên lạc</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Chức vị tộc / Chức phong</label>
                  <input
                    type="text"
                    value={formData.representativeRole}
                    onChange={(e) => setFormData({ ...formData, representativeRole: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Bố liên kết</label>
                  <select
                    value={formData.fatherId}
                    onChange={(e) => setFormData({ ...formData, fatherId: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-slate-50"
                  >
                    <option value="">Không rõ hoặc không có</option>
                    {members.filter(m => m.gender === Gender.MALE && m.id !== selectedMember.id).map(m => (
                      <option key={m.id} value={m.id}>Đời {m.generation} - {m.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Mẹ liên kết</label>
                  <select
                    value={formData.motherId}
                    onChange={(e) => setFormData({ ...formData, motherId: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-slate-50"
                  >
                    <option value="">Không rõ</option>
                    {members.filter(m => m.gender === Gender.FEMALE && m.id !== selectedMember.id).map(m => (
                      <option key={m.id} value={m.id}>Đời {m.generation} - {m.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Công việc thực hành</label>
                <input
                  type="text"
                  value={formData.job}
                  onChange={(e) => setFormData({ ...formData, job: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Gợi ý sự tích / Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-slate-50 h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  id="btn-submit-tree-edit"
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg cursor-pointer"
                >
                  Cập nhật thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2.5 MODAL XÓA THÀNH VIÊN (DELETE CONFIRMATION DIALOG) */}
      {showDeleteModal && (
        <div id="modal-tree-delete-member" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border rounded-2xl p-6 shadow-2xl w-full max-w-md">
            <h3 className="font-sans font-semibold text-slate-900 text-base mb-2">Xác nhận xóa thành viên phả?</h3>
            <p className="text-xs text-slate-500 font-sans mb-4">
              Hành động này sẽ gỡ bỏ vĩnh viễn nút thành viên khỏi sơ đồ vẽ cây Nguyễn Bá tộc và lưu vết kỷ niệm. Hành động này không thể hoàn tác.
            </p>

            <form onSubmit={handleDeleteSubmit} className="flex flex-col gap-3 text-xs font-sans">
              <div>
                <label className="block text-red-700 font-bold mb-1">Lý do xóa vị trí phả hệ (Bắt buộc) *</label>
                <input
                  id="input-delete-reason"
                  type="text"
                  required
                  placeholder="Ví dụ: Nhập trùng dữ liệu / Đính chính quan hệ..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full border border-red-300 bg-red-50/20 rounded-lg p-2 focus:outline-red-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  id="btn-confirm-delete-tree"
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg cursor-pointer"
                >
                  Xác nhận xóa vĩnh viễn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2.6 MODAL LIÊN KẾT TÀI KHOẢN (ACCOUNT LINK MODAL) */}
      {linkAccountModal && selectedMember && (
        <div id="modal-tree-link-account" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border rounded-2xl p-6 shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center pb-3 border-b mb-4">
              <h3 className="font-sans font-semibold text-slate-900 text-sm uppercase">Ánh xạ tài khoản ứng dụng</h3>
              <button onClick={() => setLinkAccountModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLinkAccountSubmit} className="flex flex-col gap-3 text-xs font-sans">
              <p className="text-slate-500 mb-2 leading-relaxed">
                Khi thực hiện ánh xạ, đinh nam trên sơ đồ gia phả [<strong>{selectedMember.fullName}</strong>] sẽ được kết nối với tài khoản đăng nhập tương ứng để họ có toàn quyền cập nhật tiểu sử cá nhân và phản hồi sự kiện dòng họ.
              </p>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Chọn tài khoản đang chờ phê duyệt phả</label>
                <select
                  required
                  value={linkAccountId}
                  onChange={(e) => setLinkAccountId(e.target.value)}
                  className="w-full border rounded-lg p-2.5 bg-slate-50 text-sm focus:outline-rose-500"
                >
                  {pendingLeaderAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.fullName} ({acc.phone} - Mã mời: {acc.inviteCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setLinkAccountModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  id="btn-submit-link-account"
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer"
                >
                  Lưu & Cấp phát quyền con cháu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}