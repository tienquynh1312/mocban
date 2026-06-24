/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Eye, 
  MapPin, Clock, CheckCircle, X, AlertTriangle, Users, MessageSquare, RefreshCw
} from "lucide-react";
import { ClanEvent, EventStatus, EventType, UserRole, UserAccount, RSVPStatus, ClanMember, LivingStatus } from "../types";
import { convertLunarToSolar2026 } from "../data/seedData";

interface CalendarMonthProps {
  events: ClanEvent[];
  members: ClanMember[];
  currentAccount: UserAccount;
  onAddEvent: (newEvent: Omit<ClanEvent, "id">) => void;
  onUpdateEvent: (updatedEvent: ClanEvent) => void;
  onAutoGenerateGiocles: () => void;
}

export default function CalendarMonth({
  events,
  members,
  currentAccount,
  onAddEvent,
  onUpdateEvent,
  onAutoGenerateGiocles,
}: CalendarMonthProps) {
  const [currentMonth, setCurrentMonth] = useState(3);
  const currentYear = 2026;

  const [selectedEvent, setSelectedEvent] = useState<ClanEvent | null>(null);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showRsvpModal, setShowRsvpModal] = useState(false);

  const [eventData, setEventData] = useState({
    title: "",
    type: EventType.DEATH_ANNIVERSARY,
    startDate: new Date().toISOString().split("T")[0],
    startTime: "08:00",
    lunarDateLabel: "",
    location: "Từ đường dòng họ",
    description: "",
    attendeeType: "ALL" as "ALL" | "ROLE" | "CUSTOM",
    attendeeRoles: [] as string[],
    attendeeIds: [] as string[],
  });

  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus>(RSVPStatus.ATTENDING);
  const [rsvpGuests, setRsvpGuests] = useState(0);
  const [rsvpReason, setRsvpReason] = useState("");
  const [simulatedLogs, setSimulatedLogs] = useState<string[]>([]);

  const isAdmin    = currentAccount.role === UserRole.ADMIN;
  const isLeader   = currentAccount.role === UserRole.LEADER;
  const isTreasurer = currentAccount.role === UserRole.TREASURER;
  const isMember   = currentAccount.role === UserRole.MEMBER;
  const isGuest    = currentAccount.role === UserRole.GUEST;
  const canManageEvent = isLeader;
  // Chỉ Thành viên và Ban tài chính mới phản hồi RSVP (UC3.7)
  const canRsvp = isMember || isTreasurer;

  const pushNotificationSimulation = (eventTitle: string, status: EventStatus, customReason?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    let text = "";
    if (status === EventStatus.CANCELLED) {
      text = `[${timestamp}] 🔔 THÔNG BÁO KHẨN: Sự kiện [${eventTitle}] đã bị HỦY với lý do: "${customReason || "Thay đổi đột xuất"}". Thư cáo lỗi đã gửi đến toàn thể dòng họ.`;
    } else if (status === EventStatus.POSTPONED) {
      text = `[${timestamp}] 🔔 THÔNG BÁO HOÃN LỊCH: Sự kiện [${eventTitle}] đã lùi ngày. Chi tiết: "${customReason}". Hãy kiểm tra lại lịch gia tộc mới.`;
    } else {
      text = `[${timestamp}] 🔔 HỆ THỐNG GIA TỘC: Đã tạo mới hành trình [${eventTitle}]. Hộp thư thông báo RSVP tự động quét gởi tới 25 thành viên.`;
    }
    setSimulatedLogs(prev => [text, ...prev]);
  };

  const monthNames = [
    "Tháng Một", "Tháng Hai", "Tháng Ba", "Tháng Tư", "Tháng Năm", "Tháng Sáu",
    "Tháng Bảy", "Tháng Tám", "Tháng Chín", "Tháng Mười", "Tháng Mười Một", "Tháng Mười Hai"
  ];

  const daysInMonthList = useMemo(() => {
    const days = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startDay = new Date(currentYear, currentMonth, 1).getDay();
    const list = [];
    for (let i = 0; i < startDay; i++) list.push(null);
    for (let d = 1; d <= days; d++) list.push(d);
    return list;
  }, [currentMonth]);

  const getLunarDayLabel = (day: number) => {
    if (currentMonth === 3) {
      if (day === 4) return "17/02";
      if (day === 17) return "01/03";
      if (day === 26) return "10/03";
      if (day < 17) return `${day + 13}/02`;
      return `${day - 16}/03`;
    }
    if (currentMonth === 4) {
      if (day === 1) return "15/03";
      if (day === 17) return "01/04";
      if (day < 17) return `${day + 14}/03`;
      return `${day - 16}/04`;
    }
    if (currentMonth === 10) {
      if (day === 19) return "10/10";
      return "Âm";
    }
    return "";
  };

  const handlePrevMonth = () => setCurrentMonth(m => (m === 0 ? 11 : m - 1));
  const handleNextMonth = () => setCurrentMonth(m => (m === 11 ? 0 : m + 1));

  const getEventsForDay = (day: number) => {
    if (!day) return [];
    const datestr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => (e.startDate || "").split("T")[0] === datestr);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    onAddEvent({
      title: eventData.title,
      type: eventData.type,
      startDate: eventData.startDate,
      startTime: eventData.startTime,
      lunarDateLabel: eventData.lunarDateLabel,
      location: eventData.location,
      description: eventData.description,
      status: EventStatus.UPCOMING,
      attendeeType: eventData.attendeeType,
      attendeeRoles: eventData.attendeeRoles,
      attendeeIds: eventData.attendeeIds,
      createdBy: currentAccount.fullName,
      createdAt: new Date().toISOString().split("T")[0],
      rsvps: []
    } as any);
    pushNotificationSimulation(eventData.title, EventStatus.UPCOMING);
    setShowAddEventModal(false);
    setEventData(f => ({ ...f, attendeeType: "ALL", attendeeRoles: [], attendeeIds: [] }));
  };

  const handleStatusChange = (eventId: string, newStatus: EventStatus) => {
    const targetEvent = events.find(ev => ev.id === eventId);
    if (!targetEvent) return;
    let reason = "";
    if (newStatus === EventStatus.CANCELLED) {
      reason = prompt("Nhập lý do HỦY sự kiện:") || "Thay đổi kế hoạch ban tế tự";
    } else if (newStatus === EventStatus.POSTPONED) {
      reason = prompt("Nhập lý do HOÃN sự kiện:") || "Thời tiết không thuận hòa";
    }
    onUpdateEvent({
      ...targetEvent,
      status: newStatus,
      cancelReason: newStatus === EventStatus.CANCELLED ? reason : undefined,
      postponeReason: newStatus === EventStatus.POSTPONED ? reason : undefined
    });
    pushNotificationSimulation(targetEvent.title, newStatus, reason);
    setSelectedEvent(prev => prev && prev.id === eventId ? {
      ...prev, status: newStatus,
      cancelReason: newStatus === EventStatus.CANCELLED ? reason : undefined,
      postponeReason: newStatus === EventStatus.POSTPONED ? reason : undefined
    } : prev);
  };

  const handleRsvpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    if (rsvpStatus === RSVPStatus.ABSENT && !rsvpReason.trim()) {
      alert("Quy ước dòng họ: Nếu vắng mặt, bạn bắt buộc phải ghi rõ lý do!");
      return;
    }
    const currentRsvps = [...selectedEvent.rsvps];
    const userRsvpIndex = currentRsvps.findIndex(r => r.accountId === currentAccount.id);
    const newRsvp = {
      accountId: currentAccount.id,
      fullName: currentAccount.fullName,
      status: rsvpStatus,
      additionalGuests: rsvpStatus === RSVPStatus.ABSENT ? 0 : rsvpGuests,
      reason: rsvpStatus === RSVPStatus.ABSENT ? rsvpReason : undefined,
      updatedAt: new Date().toISOString().split("T")[0]
    };
    if (userRsvpIndex > -1) currentRsvps[userRsvpIndex] = newRsvp;
    else currentRsvps.push(newRsvp);
    onUpdateEvent({ ...selectedEvent, rsvps: currentRsvps });
    setSelectedEvent(prev => prev ? { ...prev, rsvps: currentRsvps } : null);
    setShowRsvpModal(false);
    alert("Phản hồi RSVP tham dự của bạn đã được ghi vào hệ thống thành công!");
  };

  const myRsvp = useMemo(() => {
    if (!selectedEvent) return null;
    return selectedEvent.rsvps.find(r => r.accountId === currentAccount.id) || null;
  }, [selectedEvent, currentAccount]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* LỊCH CHÍNH */}
      <div className="xl:col-span-2 bg-white border border-rose-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-rose-50 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-rose-50 text-rose-700 rounded-lg"><CalendarIcon className="w-5 h-5" /></span>
            <div>
              <h3 className="font-sans font-semibold text-slate-900 text-sm">LỊCH SỰ KIỆN GIA TỘC 2026</h3>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5">Hiển thị song song lịch Dương (Số to) và lịch Âm (Chữ nhỏ) chuyên biệt.</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {canManageEvent && (
              <button id="btn-auto-anniversaries"
                onClick={() => { onAutoGenerateGiocles(); alert("Hệ thống đã tự động rà soát toàn bộ người đã mất trong gia phả và đồng bộ lập sự kiện tế kỵ Giỗ năm 2026!"); }}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold cursor-pointer border border-rose-100">
                <RefreshCw className="w-3.5 h-3.5" /> Lập Lịch Giỗ Tự Động
              </button>
            )}
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
              <span className="text-xs font-bold font-sans text-slate-700 px-2 min-w-[90px] text-center">{monthNames[currentMonth]} {currentYear}</span>
              <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
            </div>
            {canManageEvent && (
              <button id="btn-calendar-add-event" onClick={() => setShowAddEventModal(true)}
                className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer">
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center font-sans">
          {["T2","T3","T4","T5","T6","T7","CN"].map(d => (
            <div key={d} className="text-[11px] font-bold text-slate-400 py-2">{d}</div>
          ))}
          {daysInMonthList.map((day, idx) => {
            const hasDay = day !== null;
            const dayEvents = hasDay ? getEventsForDay(day!) : [];
            const lunarLabel = hasDay ? getLunarDayLabel(day!) : "";
            return (
              <div key={idx} className={`min-h-[75px] rounded-xl p-1 border border-rose-50/50 flex flex-col justify-between text-left ${hasDay ? "bg-slate-50/50 hover:bg-rose-50/10" : "bg-transparent border-none"}`}>
                {hasDay && (
                  <>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-700">{day}</span>
                      {lunarLabel && <span className="text-[8px] font-mono text-emerald-600 font-bold bg-emerald-50 px-1 rounded">{lunarLabel}</span>}
                    </div>
                    <div className="flex flex-col gap-1 mt-1.5 overflow-hidden">
                      {dayEvents.map(e => {
                        let colorClass = "bg-blue-50 text-blue-700 border-blue-200";
                        if (e.type === EventType.DEATH_ANNIVERSARY) colorClass = "bg-red-50 text-red-700 border-red-200";
                        if (e.status === EventStatus.POSTPONED) colorClass = "bg-amber-50 text-amber-800 border-amber-200 animate-pulse";
                        if (e.status === EventStatus.CANCELLED) colorClass = "bg-slate-100 text-slate-500 border-slate-300 line-through";
                        return (
                          <div id={`day-event-${e.id}`} key={e.id} onClick={() => setSelectedEvent(e)}
                            className={`p-1 text-[8px] font-sans font-bold leading-tight rounded-md border truncate cursor-pointer hover:shadow-xs ${colorClass}`}>
                            {e.title}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CHI TIẾT SỰ KIỆN */}
      <div className="bg-white border border-rose-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
        {selectedEvent ? (
          <div className="flex flex-col h-full justify-between gap-4">
            <div>
              <div className="flex justify-between items-start pb-2 border-b border-rose-50 mb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-500">
                  {selectedEvent.type === EventType.DEATH_ANNIVERSARY ? "Hương kỵ giỗ tộc" : "Gặp mặt hành chính"}
                </span>
                <button onClick={() => setSelectedEvent(null)} className="p-1 hover:bg-slate-100 rounded text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <h4 className="font-sans font-bold text-slate-900 text-sm mb-2">{selectedEvent.title}</h4>
              <div className="mb-4">
                {selectedEvent.status === EventStatus.UPCOMING && <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold">Chưa diễn ra / Sắp tế lễ</span>}
                {selectedEvent.status === EventStatus.COMPLETED && <span className="text-xs bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">Đã hoàn thành</span>}
                {selectedEvent.status === EventStatus.POSTPONED && <span className="text-xs bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">Tạm hoãn</span>}
                {selectedEvent.status === EventStatus.CANCELLED && <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">Đã hủy bỏ</span>}
              </div>
              <div className="space-y-2.5 text-xs text-slate-700 font-sans leading-relaxed">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>Dương lịch: {(selectedEvent.startDate || "").split("T")[0]} {selectedEvent.startTime || "08:00"}</span>
                </div>
                {selectedEvent.lunarDateLabel && (
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Clock className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Lễ giỗ Âm lịch: {selectedEvent.lunarDateLabel}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>{selectedEvent.location}</span>
                </div>
                {selectedEvent.postponeReason && <div className="bg-amber-50 border border-amber-200 p-2 text-amber-900 rounded-lg italic">Lý do hoãn: {selectedEvent.postponeReason}</div>}
                {selectedEvent.cancelReason && <div className="bg-red-50 border border-red-200 p-2 text-red-900 rounded-lg italic">Lý do hủy: {selectedEvent.cancelReason}</div>}
                {selectedEvent.description && <div className="p-3 bg-slate-50 border rounded-lg mt-3"><p className="text-xs text-slate-600">{selectedEvent.description}</p></div>}
              </div>
              <div className="mt-4 pt-3 border-t">
                <div className="flex items-center justify-between text-xs font-sans mb-2">
                  <strong className="text-slate-900">Danh sách RSVP ({selectedEvent.rsvps.length}):</strong>
                  <span className="text-[10px] text-slate-500">Thời gian thực</span>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1.5">
                  {selectedEvent.rsvps.length > 0 ? selectedEvent.rsvps.map((r, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px] bg-rose-50/20 p-2 rounded border border-rose-50/40">
                      <span className="font-semibold text-slate-800">{r.fullName}</span>
                      {r.status === RSVPStatus.ATTENDING
                        ? <span className="text-emerald-700 bg-emerald-50 px-1.5 rounded font-bold">Đi ({r.additionalGuests + 1})</span>
                        : <span className="text-red-700 bg-red-50 px-1.5 rounded font-bold" title={r.reason}>Vắng</span>
                      }
                    </div>
                  )) : <p className="text-[11px] text-slate-400 italic">Chưa có ai phản hồi RSVP.</p>}
                </div>
              </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="pt-4 border-t flex flex-col gap-2">
              {/* UC3.7: Chỉ Thành viên và Ban tài chính phản hồi RSVP */}
              {canRsvp && selectedEvent.status === EventStatus.UPCOMING && (
                <button id="btn-trigger-rsvp-overlay"
                  onClick={() => { setRsvpStatus(myRsvp?.status || RSVPStatus.ATTENDING); setRsvpGuests(myRsvp?.additionalGuests || 0); setRsvpReason(myRsvp?.reason || ""); setShowRsvpModal(true); }}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer">
                  <CheckCircle className="w-4 h-4" /> {myRsvp ? "Đổi phản hồi tham dự" : "Phản hồi tham dự"}
                </button>
              )}

              {/* UC3.5: Chỉnh sửa, Hủy, Tạm hoãn — chỉ Trưởng họ */}
              {canManageEvent && selectedEvent.status === EventStatus.UPCOMING && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => {
                      setEventData({ title: selectedEvent.title, type: selectedEvent.type, startDate: (selectedEvent.startDate || "").split("T")[0], startTime: selectedEvent.startTime || "08:00", lunarDateLabel: selectedEvent.lunarDateLabel || "", location: selectedEvent.location, description: selectedEvent.description || "", attendeeType: "ALL", attendeeRoles: [], attendeeIds: [] });
                      setShowAddEventModal(true);
                    }} className="px-3 py-1.5 text-[10px] uppercase font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer">
                      ✏️ Chỉnh sửa
                    </button>
                    <button id="btn-calendar-cancel" onClick={() => handleStatusChange(selectedEvent.id, EventStatus.CANCELLED)}
                      className="px-3 py-1.5 text-[10px] uppercase font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer">
                      🚫 Hủy sự kiện
                    </button>
                  </div>
                  <button id="btn-calendar-postpone" onClick={() => handleStatusChange(selectedEvent.id, EventStatus.POSTPONED)}
                    className="w-full px-3 py-1.5 text-[10px] uppercase font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg cursor-pointer">
                    ⏸ Tạm hoãn sự kiện
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-20 text-slate-400">
            <span className="p-3 bg-rose-50 text-rose-500 rounded-full mb-3"><Plus className="w-6 h-6 animate-pulse" /></span>
            <h4 className="font-sans font-bold text-slate-700 text-sm">Chi tiết sự kiện</h4>
            <p className="text-xs text-slate-500 font-sans max-w-[200px] mt-1.5">Click chọn các ô nhãn sự kiện màu Đỏ (Lễ chạp / Giỗ kỵ) hoặc màu Xanh (Đại hội / Họp tộc) trên lịch để quản lý RSVP.</p>
          </div>
        )}
      </div>

      {/* MODAL THÊM/SỬA SỰ KIỆN */}
      {showAddEventModal && (
        <div id="modal-calendar-add-event" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border rounded-2xl p-6 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b mb-4">
              <h3 className="font-sans font-semibold text-slate-900 text-sm">Tạo / Chỉnh sửa sự kiện</h3>
              <button onClick={() => setShowAddEventModal(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateEvent} className="flex flex-col gap-3 text-xs font-sans">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Tên sự kiện *</label>
                <input type="text" required placeholder="Ví dụ: Giỗ tổ phụ Nguyễn Bá Cao..." value={eventData.title}
                  onChange={e => setEventData({ ...eventData, title: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-slate-50 focus:outline-rose-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Thể loại</label>
                  <select value={eventData.type} onChange={e => setEventData({ ...eventData, type: e.target.value as any })} className="w-full border rounded-lg p-2 bg-slate-50">
                    <option value={EventType.DEATH_ANNIVERSARY}>Giỗ chạp</option>
                    <option value={EventType.MEETING}>Họp tộc / Đại hội</option>
                    <option value={EventType.GRAVE_VISIT}>Tảo mộ tổ tiên</option>
                    <option value={EventType.OTHER}>Lễ khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Giờ tổ chức</label>
                  <input type="time" value={eventData.startTime} onChange={e => setEventData({ ...eventData, startTime: e.target.value })} className="w-full border rounded-lg p-2 bg-slate-50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Ngày Dương lịch *</label>
                  <input type="date" required value={eventData.startDate} onChange={e => setEventData({ ...eventData, startDate: e.target.value })} className="w-full border rounded-lg p-2 bg-slate-50" />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Ghi chú Âm lịch</label>
                  <input type="text" placeholder="VD: 10/03 Âm lịch" value={eventData.lunarDateLabel} onChange={e => setEventData({ ...eventData, lunarDateLabel: e.target.value })} className="w-full border rounded-lg p-2 bg-slate-50" />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Địa điểm *</label>
                <input type="text" required value={eventData.location} onChange={e => setEventData({ ...eventData, location: e.target.value })} className="w-full border rounded-lg p-2 bg-slate-50" />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nội dung / Ghi chú</label>
                <textarea value={eventData.description} onChange={e => setEventData({ ...eventData, description: e.target.value })} className="w-full border rounded-lg p-2 bg-slate-50 h-20 resize-none" placeholder="Ghi chú lễ sắm..." />
              </div>

              {/* Thành phần tham dự — UC3.1 */}
              <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                <label className="block text-slate-700 font-semibold text-xs">Thành phần tham dự</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: "ALL", label: "🏠 Toàn dòng họ" },
                    { value: "ROLE", label: "👤 Theo quyền" },
                    { value: "CUSTOM", label: "✏️ Tùy chọn cụ thể" },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setEventData(f => ({ ...f, attendeeType: opt.value as any, attendeeRoles: [], attendeeIds: [] }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${eventData.attendeeType === opt.value ? "bg-rose-600 text-white border-rose-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {eventData.attendeeType === "ROLE" && (
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] text-slate-500">Chọn vai trò được mời:</p>
                    {[
                      { value: "LEADER", label: "Trưởng họ" },
                      { value: "TREASURER", label: "Ban tài chính" },
                      { value: "MEMBER", label: "Thành viên" },
                    ].map(r => (
                      <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={eventData.attendeeRoles.includes(r.value)}
                          onChange={e => { const roles = e.target.checked ? [...eventData.attendeeRoles, r.value] : eventData.attendeeRoles.filter(x => x !== r.value); setEventData(f => ({ ...f, attendeeRoles: roles })); }}
                          className="rounded" />
                        <span className="text-xs text-slate-700">{r.label}</span>
                      </label>
                    ))}
                  </div>
                )}
                {eventData.attendeeType === "CUSTOM" && (
                  <div className="space-y-1 pt-1 max-h-32 overflow-y-auto">
                    <p className="text-[10px] text-slate-500">Chọn thành viên cụ thể:</p>
                    {members.map(m => (
                      <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={eventData.attendeeIds.includes(m.id)}
                          onChange={e => { const ids = e.target.checked ? [...eventData.attendeeIds, m.id] : eventData.attendeeIds.filter(x => x !== m.id); setEventData(f => ({ ...f, attendeeIds: ids })); }}
                          className="rounded" />
                        <span className="text-xs text-slate-700">{m.fullName} — Đời {m.generation}</span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  {eventData.attendeeType === "ALL" && "Tất cả thành viên đều được mời."}
                  {eventData.attendeeType === "ROLE" && `Đã chọn ${eventData.attendeeRoles.length} vai trò.`}
                  {eventData.attendeeType === "CUSTOM" && `Đã chọn ${eventData.attendeeIds.length} thành viên.`}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => setShowAddEventModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg cursor-pointer">Hủy</button>
                <button id="btn-submit-calendar-add" type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer">Lưu sự kiện</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RSVP */}
      {showRsvpModal && selectedEvent && (
        <div id="modal-calendar-rsvp" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border rounded-2xl p-6 shadow-2xl w-full max-w-sm">
            <div className="flex justify-between items-center pb-2 border-b mb-4">
              <h3 className="font-sans font-semibold text-slate-900 text-sm">Phản hồi tham dự</h3>
              <button onClick={() => setShowRsvpModal(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleRsvpSubmit} className="flex flex-col gap-3 text-xs font-sans">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Xác nhận tham gia</label>
                <select value={rsvpStatus} onChange={e => setRsvpStatus(e.target.value as RSVPStatus)} className="w-full border rounded-lg p-2 bg-slate-50">
                  <option value={RSVPStatus.ATTENDING}>Đồng ý, tôi sẽ tham dự</option>
                  <option value={RSVPStatus.ABSENT}>Vắng mặt (bắt buộc ghi lý do)</option>
                  <option value={RSVPStatus.UNDECIDED}>Chưa chắc chắn</option>
                </select>
              </div>
              {rsvpStatus !== RSVPStatus.ABSENT ? (
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Số người đi kèm (tối đa 10)</label>
                  <input type="number" min="0" max="10" value={rsvpGuests} onChange={e => setRsvpGuests(Number(e.target.value))} className="w-full border rounded-lg p-2 bg-slate-50" />
                </div>
              ) : (
                <div>
                  <label className="block text-red-700 font-bold mb-1">Lý do vắng mặt *</label>
                  <textarea required placeholder="Ghi rõ lý do vắng mặt..." value={rsvpReason} onChange={e => setRsvpReason(e.target.value)} className="w-full border border-red-200 bg-red-50/10 rounded-lg p-2 h-20 resize-none" />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => setShowRsvpModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg cursor-pointer">Hủy</button>
                <button id="btn-submit-rsvp" type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer">Ghi nhận RSVP</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG BROADCAST */}
      <div className="xl:col-span-3 bg-slate-900 rounded-xl p-4 border border-slate-800 font-mono text-[10px] text-emerald-400">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
          <span className="font-bold tracking-widest text-[#059669]">SIMULATOR NOTIFICATION LOG CENTER (EMAIL / SMS BROADCAST MOCK)</span>
          <span className="text-slate-500">Mô phỏng phát sóng di động hỏa tốc tự động</span>
        </div>
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {simulatedLogs.length > 0
            ? simulatedLogs.map((log, i) => <div key={i} className="leading-relaxed">{log}</div>)
            : <div className="text-slate-600 italic">Chưa có bản ghi tin nhắn quảng bá nào phát sinh. Tạo mới sự kiện hoặc hoãn/hủy sự kiện để kiểm thử.</div>
          }
        </div>
      </div>
    </div>
  );
}