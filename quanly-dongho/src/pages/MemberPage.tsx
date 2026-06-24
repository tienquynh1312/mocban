/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  Search, Filter, Eye, Edit2, Trash2, ChevronLeft, ChevronRight, 
  User, CheckCircle, Smartphone, Mail, MapPin, Calendar, Heart, X,
  Users, BarChart2
} from "lucide-react";
import { ClanMember, Gender, LivingStatus, UserRole, UserAccount } from "../types";

interface MemberDataTableProps {
  members: ClanMember[];
  currentAccount: UserAccount;
  onEditMember: (member: ClanMember) => void;
  onDeleteMember: (id: string, name: string) => void;
}

export default function MemberDataTable({
  members,
  currentAccount,
  onEditMember,
  onDeleteMember,
}: MemberDataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
  const [lifeFilter, setLifeFilter] = useState<"ALL" | "ALIVE" | "DECEASED">("ALL");
  const [generationFilter, setGenerationFilter] = useState<number | "ALL">("ALL");
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [selectedMember, setSelectedMember] = useState<ClanMember | null>(null);

  const isLeader = currentAccount.role === UserRole.LEADER;

  // Lọc dữ liệu thành viên
  const processedMembers = useMemo(() => {
    // Sắp xếp mặc định: Thế hệ (đời thấp nhất trước) xong đến tuổi (ngày sinh sớm hơn trước)
    const sorted = [...members].sort((a, b) => {
      if (a.generation !== b.generation) return a.generation - b.generation;
      return (a.birthDate || "").localeCompare(b.birthDate || "");
    });

    return sorted.filter((m) => {
      const matchSearch = m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (m.phone && m.phone.includes(searchTerm)) ||
                          (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchGender = genderFilter === "ALL" || m.gender === genderFilter;
      const matchLife = lifeFilter === "ALL" || m.livingStatus === lifeFilter;
      const matchGen = generationFilter === "ALL" || m.generation === Number(generationFilter);

      return matchSearch && matchGender && matchLife && matchGen;
    });
  }, [members, searchTerm, genderFilter, lifeFilter, generationFilter]);

  // Phân trang
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedMembers.slice(startIndex, startIndex + itemsPerPage);
  }, [processedMembers, currentPage]);

  const totalPages = Math.ceil(processedMembers.length / itemsPerPage) || 1;

  const generationsList = useMemo(() => {
    const gens = members.map(m => m.generation);
    return Array.from(new Set(gens)).sort((a, b) => a - b);
  }, [members]);

  // ── Thống kê thành viên (R2.7) ───────────────────────────────────────────
  const stats = useMemo(() => {
    const total = members.length;
    const male = members.filter(m => m.gender === Gender.MALE).length;
    const female = members.filter(m => m.gender === Gender.FEMALE).length;
    const alive = members.filter(m => m.livingStatus === LivingStatus.ALIVE).length;
    const deceased = members.filter(m => m.livingStatus === LivingStatus.DECEASED).length;

    const now = new Date();
    const getAge = (birthDate: string) => {
      if (!birthDate) return null;
      const diff = now.getTime() - new Date(birthDate).getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    };

    const ageGroups = { duoi18: 0, t18_40: 0, t40_60: 0, tren60: 0, unknown: 0 };
    members.filter(m => m.livingStatus === LivingStatus.ALIVE).forEach(m => {
      const age = getAge(m.birthDate);
      if (age === null) ageGroups.unknown++;
      else if (age < 18) ageGroups.duoi18++;
      else if (age < 40) ageGroups.t18_40++;
      else if (age < 60) ageGroups.t40_60++;
      else ageGroups.tren60++;
    });

    return { total, male, female, alive, deceased, ageGroups };
  }, [members]);

  const [showStats, setShowStats] = useState(false);

  return (
    <div className="flex flex-col gap-4 bg-white border border-rose-100 rounded-2xl p-6 shadow-sm">
      {/* HEADER TRA CỨU DANH SÁCH */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center pb-4 border-b border-rose-50">
        <div>
          <h3 className="font-sans font-semibold text-slate-900 text-sm">DANH SÁCH THÀNH VIÊN GIA TỘC</h3>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Bảng thống kê đinh đố, đại điện chi họ, đời sinh hoạt thực tế và lý lịch gốc.</p>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center w-full lg:w-auto">
          {/* Nút thống kê */}
          <button
            onClick={() => setShowStats(s => !s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${showStats ? "bg-rose-600 text-white border-rose-600" : "bg-white text-slate-600 border-slate-200 hover:bg-rose-50"}`}
          >
            <BarChart2 className="w-3.5 h-3.5" /> Thống kê
          </button>
          {/* Tìm kiếm */}
          <div className="relative w-full lg:w-60">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              id="tbl-search-member"
              type="text"
              placeholder="Gõ tên, SĐT tộc viên..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-rose-500"
            />
          </div>

          {/* Bộ lọc giới tính */}
          <select
            id="tbl-gender-filter"
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="text-xs font-sans bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tất cả giới</option>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
          </select>

          {/* Bộ lọc sinh hoạt */}
          <select
            id="tbl-status-filter"
            value={lifeFilter}
            onChange={(e) => {
              setLifeFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="text-xs font-sans bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none text-slate-700 cursor-pointer"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="ALIVE">Còn sống</option>
            <option value="DECEASED">Đã khuất</option>
          </select>

          {/* Bộ lọc đời thứ */}
          <select
            id="tbl-gen-filter"
            value={generationFilter}
            onChange={(e) => {
              const val = e.target.value;
              setGenerationFilter(val === "ALL" ? "ALL" : Number(val));
              setCurrentPage(1);
            }}
            className="text-xs font-sans bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none text-slate-700 cursor-pointer"
          >
            <option value="ALL">Mọi thế hệ</option>
            {generationsList.map(g => (
              <option key={g} value={g}>Đời thú {g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* THỐNG KÊ THÀNH VIÊN (R2.7) */}
      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-rose-50/40 border border-rose-100 rounded-xl">
          {/* Giới tính */}
          <div className="bg-white rounded-xl p-3 border border-rose-100 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Giới tính</p>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-600 font-semibold">Nam</span>
                <span className="text-xs font-bold text-slate-800">{stats.male} người</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: stats.total ? `${(stats.male / stats.total) * 100}%` : "0%" }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-pink-600 font-semibold">Nữ</span>
                <span className="text-xs font-bold text-slate-800">{stats.female} người</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-pink-500 h-1.5 rounded-full" style={{ width: stats.total ? `${(stats.female / stats.total) * 100}%` : "0%" }} />
              </div>
            </div>
          </div>

          {/* Trạng thái sống */}
          <div className="bg-white rounded-xl p-3 border border-rose-100 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Tình trạng</p>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-emerald-600 font-semibold">Còn sống</span>
                <span className="text-xs font-bold text-slate-800">{stats.alive} người</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: stats.total ? `${(stats.alive / stats.total) * 100}%` : "0%" }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-semibold">Đã khuất</span>
                <span className="text-xs font-bold text-slate-800">{stats.deceased} người</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-slate-400 h-1.5 rounded-full" style={{ width: stats.total ? `${(stats.deceased / stats.total) * 100}%` : "0%" }} />
              </div>
            </div>
          </div>

          {/* Nhóm độ tuổi */}
          <div className="bg-white rounded-xl p-3 border border-rose-100 shadow-xs col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Nhóm độ tuổi (người còn sống)</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {[
                { label: "Dưới 18 tuổi", value: stats.ageGroups.duoi18, color: "bg-violet-400" },
                { label: "18 – 40 tuổi", value: stats.ageGroups.t18_40, color: "bg-blue-400" },
                { label: "40 – 60 tuổi", value: stats.ageGroups.t40_60, color: "bg-amber-400" },
                { label: "Trên 60 tuổi", value: stats.ageGroups.tren60, color: "bg-rose-400" },
              ].map(g => (
                <div key={g.label}>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-slate-600">{g.label}</span>
                    <span className="font-bold text-slate-800">{g.value}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className={`${g.color} h-1.5 rounded-full`} style={{ width: stats.alive ? `${(g.value / stats.alive) * 100}%` : "0%" }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Tổng cộng: <strong className="text-slate-700">{stats.total} thành viên</strong></p>
          </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-6">
        {/* DANH SÁCH BẢNG CHÍNH */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="bg-slate-50 border-b border-rose-50 text-slate-400 font-bold tracking-wider">
                <th className="p-3 font-sans">Mã đinh</th>
                <th className="p-3 font-sans">Họ và tên</th>
                <th className="p-3 font-sans">Thế hệ đời</th>
                <th className="p-3 font-sans">Giới tính</th>
                <th className="p-3 font-sans font-medium">Bố mẹ đẻ</th>
                <th className="p-3 font-sans">Ngày sinh/mất</th>
                <th className="p-3 font-sans">Bảo đản sinh hoạt</th>
                <th className="p-3 font-sans text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-50/50">
              {paginatedMembers.length > 0 ? (
                paginatedMembers.map((m) => {
                  const isDeceased = m.livingStatus === LivingStatus.DECEASED;
                  return (
                    <tr key={m.id} className="hover:bg-rose-50/20 text-slate-700 transition-colors">
                      <td className="p-3 font-mono text-[11px] text-slate-500 font-bold">{m.id}</td>
                      <td className="p-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{m.fullName}</span>
                          {m.representativeRole && (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[9px] font-sans font-bold uppercase">
                              {m.representativeRole}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-bold text-slate-800">Cọc Đời {m.generation}</td>
                      <td className="p-3">
                        {m.gender === Gender.MALE ? (
                          <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold text-[10px]">Nam</span>
                        ) : (
                          <span className="text-pink-700 bg-pink-50 px-2 py-0.5 rounded font-semibold text-[10px]">Nữ</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500">
                        {m.fatherId ? (
                          <span className="font-sans font-medium text-slate-700">
                            {members.find(x => x.id === m.fatherId)?.fullName}
                          </span>
                        ) : (
                          <span className="italic text-slate-400">Không rõ / Cụ tổ</span>
                        )}
                      </td>
                      <td className="p-3 font-medium">
                        {isDeceased ? (
                          <span className="text-rose-700 font-sans font-semibold">Giỗ: {m.deathDateLunar}</span>
                        ) : (
                          <span className="text-slate-600 font-sans">{m.birthDate}</span>
                        )}
                      </td>
                      <td className="p-3">
                        {isDeceased ? (
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full inline-flex items-center text-[10px] font-medium">
                            Đã khuất
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full inline-flex items-center text-[10px] font-semibold">
                            Còn sống
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            id={`btn-view-member-${m.id}`}
                            onClick={() => setSelectedMember(m)}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
                            title="Xác nhận tiểu sử"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isLeader && (
                            <>
                              <button
                                id={`btn-edit-member-${m.id}`}
                                onClick={() => onEditMember(m)}
                                className="p-1.5 hover:bg-slate-100 rounded text-amber-600"
                                title="Sửa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`btn-delete-member-${m.id}`}
                                onClick={() => onDeleteMember(m.id, m.fullName)}
                                className="p-1.5 hover:bg-red-50 rounded text-red-600"
                                title="Gỡ phả hệ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                    Không tìm thấy thành viên nào trùng khớp với bộ lọc dữ liệu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* BỘ PHÂN TRANG */}
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-rose-50 text-xs">
            <span className="text-slate-500 font-sans">
              Hiển thị <strong>{paginatedMembers.length}</strong> trên <strong>{processedMembers.length}</strong> tộc viên họ Nguyễn Bá.
            </span>

            <div className="flex items-center gap-2">
              <button
                id="btn-tbl-prev-page"
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border rounded-lg bg-slate-50 text-slate-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-sans text-slate-700 font-bold">Trang {currentPage} / {totalPages}</span>
              <button
                id="btn-tbl-next-page"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 border rounded-lg bg-slate-50 text-slate-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* CHI TIẾT BÊN PHẢI (SIDE DRAWER) */}
        {selectedMember && (
          <div className="w-full xl:w-80 bg-slate-50/50 border rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">Chi tiết hồ sơ phả hệ</span>
              <button onClick={() => setSelectedMember(null)} className="p-1 hover:bg-slate-200 rounded text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs text-slate-700 font-sans leading-relaxed">
              <div className="flex items-center gap-2 mb-2">
                <span className={`p-2 rounded-xl text-white ${selectedMember.gender === Gender.MALE ? "bg-blue-600" : "bg-pink-600"}`}>
                  <User className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">{selectedMember.fullName}</h4>
                  <p className="text-[10px] text-slate-500">Thế hệ đời {selectedMember.generation}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>Trạng thái: <strong>{selectedMember.livingStatus === LivingStatus.ALIVE ? "Còn sống" : "Đã khuất"}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span>Ngày sinh: {selectedMember.birthDate}</span>
                </div>
                {selectedMember.birthDateLunar && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Lịch âm sinh: {selectedMember.birthDateLunar}</span>
                  </div>
                )}
                {selectedMember.livingStatus === LivingStatus.DECEASED && selectedMember.deathDateLunar && (
                  <div className="flex items-center gap-2 text-rose-700 bg-rose-50 p-2 rounded border border-rose-100">
                    <Calendar className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>Ngày kỵ giỗ hằng năm: <strong>{selectedMember.deathDateLunar} Âm</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <span>Số điện thoại: {selectedMember.phone || "Không rõ"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <span>Thư điện tử: {selectedMember.email || "Không rõ"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span>Cư ngụ: {selectedMember.currentAddress || "Chưa khai báo"}</span>
                </div>
              </div>

              {selectedMember.notes && (
                <div className="bg-amber-50 p-2 text-[11px] border border-amber-200 text-amber-900 italic rounded-lg mt-2">
                  {selectedMember.notes}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}