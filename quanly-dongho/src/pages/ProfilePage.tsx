/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  BookOpen, MapPin, Landmark, Calendar, ShieldCheck, Edit2, 
  X, Save, FileText, Compass, History, HelpCircle
} from "lucide-react";
import { UserAccount, UserRole } from "../types";

interface ClanProfileViewProps {
  clanProfile: {
    name: string;
    origin: string;
    ancestorName: string;
    templeAddress: string;
    generalNotes: string;
    anniversaryDayLunar: string;
    regulations: string[];
  };
  currentAccount: UserAccount;
  onUpdateProfile: (updatedProfile: any) => void;
}

export default function ClanProfileView({
  clanProfile,
  currentAccount,
  onUpdateProfile,
}: ClanProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    name: clanProfile.name,
    origin: clanProfile.origin,
    ancestorName: clanProfile.ancestorName,
    templeAddress: clanProfile.templeAddress,
    generalNotes: clanProfile.generalNotes,
    anniversaryDayLunar: clanProfile.anniversaryDayLunar,
    regulationsText: clanProfile.regulations.join("\n")
  });

  const isLeader = currentAccount.role === UserRole.LEADER;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name: formData.name,
      origin: formData.origin,
      ancestorName: formData.ancestorName,
      templeAddress: formData.templeAddress,
      generalNotes: formData.generalNotes,
      anniversaryDayLunar: formData.anniversaryDayLunar,
      regulations: formData.regulationsText.split("\n").filter(line => line.trim() !== "")
    });
    setIsEditing(false);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* 5.1 NGUỒN GỐC & TỔ TIÊN (CLAN ORIGINS & TEMPLE CARD) */}
      <div className="xl:col-span-2 flex flex-col gap-6">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="bg-white border border-rose-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4 text-xs font-sans">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="font-semibold text-slate-900 text-sm uppercase">Hiệu chỉnh Hồ sơ dòng họ cơ bản</h3>
              <button type="button" onClick={() => setIsEditing(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Tên Dòng họ / Clan Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-lg p-2.5 bg-slate-50 focus:outline-rose-500 font-semibold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Cụ Tổ Sáng lập *</label>
                <input
                  type="text"
                  required
                  value={formData.ancestorName}
                  onChange={(e) => setFormData({ ...formData, ancestorName: e.target.value })}
                  className="w-full border rounded-lg p-2.5 bg-slate-50 focus:outline-rose-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Quê quán cổ tích gốc sơ khai *</label>
                <input
                  type="text"
                  required
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  className="w-full border rounded-lg p-2.5 bg-slate-50 focus:outline-rose-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Ngày Giỗ tổ hội kỵ hằng năm (Lịch Âm) *</label>
                <input
                  type="text"
                  required
                  value={formData.anniversaryDayLunar}
                  onChange={(e) => setFormData({ ...formData, anniversaryDayLunar: e.target.value })}
                  className="w-full border rounded-lg p-2.5 bg-slate-50 focus:outline-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Địa chỉ Từ đường / Nhà thờ tổ dòng họ *</label>
              <input
                type="text"
                required
                value={formData.templeAddress}
                onChange={(e) => setFormData({ ...formData, templeAddress: e.target.value })}
                className="w-full border rounded-lg p-2.5 bg-slate-50 focus:outline-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Mô tả lịch sử di sản dòng tộc *</label>
              <textarea
                required
                rows={4}
                value={formData.generalNotes}
                onChange={(e) => setFormData({ ...formData, generalNotes: e.target.value })}
                className="w-full border rounded-lg p-2.5 bg-slate-50 font-sans leading-relaxed resize-none focus:outline-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Tộc ước / Quy quy phạm dòng họ (Một điều một dòng) *</label>
              <textarea
                required
                rows={5}
                value={formData.regulationsText}
                onChange={(e) => setFormData({ ...formData, regulationsText: e.target.value })}
                className="w-full border rounded-lg p-2.5 bg-slate-50 font-mono leading-relaxed resize-none focus:outline-rose-500"
                placeholder="Mỗi quy định cách nhau bởi một dòng xuống hàng..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                id="btn-save-clan-profile"
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Bảo lưu cập nhật
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white border border-rose-100 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
            <div className="flex justify-between items-center pb-3 border-b">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-50 text-amber-800 rounded-lg">
                  <Landmark className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-sans font-bold text-slate-900 text-base uppercase tracking-wider">{clanProfile.name}</h3>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">Hồ sơ lịch sử phả hệ tôn nghiêm và đền thờ tổ.</p>
                </div>
              </div>

              {isLeader && (
                <button
                  id="btn-edit-clan-profile"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Biên tập hồ sơ
                </button>
              )}
            </div>

            {/* Khối tóm tắt thông tin di tích cổ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Compass className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-slate-800 font-sans uppercase tracking-wider">Cội nguồn phát tích:</h4>
                  <p className="text-slate-600 font-sans mt-1">{clanProfile.origin}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Calendar className="w-5 h-5 text-rose-700 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-slate-800 font-sans uppercase tracking-wider">Lễ Giỗ tổ chính thường niên:</h4>
                  <p className="text-rose-700 font-sans font-semibold mt-1">{clanProfile.anniversaryDayLunar}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 md:col-span-2 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-indigo-700 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-slate-800 font-sans uppercase tracking-wider">Từ đường hương khói (Đền thờ):</h4>
                  <p className="text-slate-600 font-sans mt-1 font-medium">{clanProfile.templeAddress}</p>
                </div>
              </div>
            </div>

            <div className="text-xs leading-relaxed text-slate-700 font-sans">
              <div className="flex items-center gap-1.5 mb-2 text-slate-900 font-bold uppercase tracking-wider">
                <History className="w-4 h-4 text-emerald-600" />
                <span>Di tích lịch sử & Lai lịch phả hệ</span>
              </div>
              <p className="p-4 bg-amber-50/40 border border-amber-100 rounded-xl italic">
                "{clanProfile.generalNotes}"
              </p>
            </div>

            {/* Mô phỏng ảnh từ đường khang trang */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Hình ảnh di tích từ đường dâng cúng hương hỏa</div>
              <div className="grid grid-cols-3 gap-2">
                <img
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300"
                  alt="Temple Exterior"
                  referrerPolicy="no-referrer"
                  className="rounded-lg h-24 w-full object-cover border"
                />
                <img
                  src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=300"
                  alt="Ancestral Worship Altar"
                  referrerPolicy="no-referrer"
                  className="rounded-lg h-24 w-full object-cover border"
                />
                <img
                  src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=300"
                  alt="Vu Ban, Nam Dinh scenery"
                  referrerPolicy="no-referrer"
                  className="rounded-lg h-24 w-full object-cover border"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5.2 TỘC ƯỚC DÒNG HỌ - 5 ĐIỀU RÀNG BUỘC (CLAN REGULATION RULES) */}
      <div className="xl:col-span-1 bg-white border border-rose-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div className="pb-2 border-b flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-rose-700" />
          <h3 className="font-sans font-bold text-slate-935 text-xs uppercase tracking-wider">Hương ước & Tộc ước dòng họ</h3>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed font-sans">
          Năm chuẩn quy phạm ràng buộc đạo nghĩa và hành vi ứng xử thống nhất của các thế hệ đinh nam con cháu Nguyễn Bá Tộc.
        </p>

        <div className="flex flex-col gap-3 py-2">
          {clanProfile.regulations.map((reg, idx) => (
            <div key={idx} className="p-3 bg-rose-50/30 border border-rose-105 rounded-xl flex items-start gap-2.5 font-sans">
              <span className="w-5 h-5 bg-rose-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold font-mono flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <p className="text-xs text-slate-700 font-sans font-medium select-text">
                {reg}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 border rounded-xl p-3 text-[10px] text-slate-400 flex items-start gap-1.5 leading-snug font-sans">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>Tộc phong gia pháp: Bản tộc ước chính thư được ký thông qua bởi Hội đồng gia tộc ngày 12/03 Âm kỵ tổ năm 2018.</span>
        </div>
      </div>
    </div>
  );
}
