/**
 * src/routes/accounts.js — Multi-clan version
 * ADMIN: xem tất cả, filter theo clanId
 * LEADER/TREASURER/MEMBER: chỉ xem dòng họ của mình (req.user.clanId)
 */
const express = require("express");
const { pool } = require("../db/pool");
const { authenticate, requireRole, requireActive } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate, requireActive);

// ── GET /api/accounts ─────────────────────────────────────────────────────────
router.get("/", requireRole("ADMIN", "LEADER"), async (req, res) => {
  try {
    const isAdmin = req.user.role === "ADMIN";
    const clanId  = isAdmin ? (req.query.clanId || null) : req.user.clanId;

    let where = [];
    let params = [];
    if (req.query.status) { where.push("status = ?"); params.push(req.query.status); }
    if (req.query.role)   { where.push("role = ?");   params.push(req.query.role); }
    // Nếu không phải Admin → chỉ lấy tài khoản thuộc dòng họ mình
    if (!isAdmin && clanId) {
      where.push("(clanId = ? OR role = 'ADMIN')");
      params.push(clanId);
    }
    const wc = where.length ? "WHERE " + where.join(" AND ") : "";

    const [rows] = await pool.query(
      `SELECT id,fullName,phone,email,birthDate,gender,hometown,address,notes,
              role,status,inviteCode,mappedMemberId,rejectionReason,blockReason,
              registeredAt,clanId
       FROM tbl_accounts ${wc} ORDER BY registeredAt DESC`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Lỗi server." });
  }
});

// ── PUT /api/accounts/:id/approve-admin ───────────────────────────────────────
router.put("/:id/approve-admin", requireRole("ADMIN"), async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM tbl_accounts WHERE id=?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    if (rows[0].status !== "PENDING_ADMIN") {
      return res.status(400).json({ error: "Tài khoản không ở trạng thái PENDING_ADMIN." });
    }
    await pool.query(
      "UPDATE tbl_accounts SET status='PENDING_LEADER' WHERE id=?",
      [req.params.id]
    );
    await pool.query(
      "INSERT INTO tbl_audit_logs (actorName,action,module,details) VALUES (?,?,?,?)",
      [req.user.fullName, "DUYỆT KỸ THUẬT", "Accounts",
       `Admin duyệt tài khoản [${rows[0].fullName}] → chờ Trưởng họ`]
    );
    return res.json({ message: "Đã chuyển → PENDING_LEADER." });
  } catch (err) {
    return res.status(500).json({ error: "Lỗi server." });
  }
});

// ── PUT /api/accounts/:id/approve-leader ──────────────────────────────────────
router.put("/:id/approve-leader", requireRole("LEADER"), async (req, res) => {
  const { role, memberId } = req.body;
  const allowedRoles = ["MEMBER", "TREASURER", "LEADER"];
  if (!allowedRoles.includes(role)) return res.status(400).json({ error: "Vai trò không hợp lệ." });
  try {
    const [rows] = await pool.query("SELECT * FROM tbl_accounts WHERE id=?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy tài khoản." });

    // Gắn clanId của Trưởng họ đang duyệt cho tài khoản được duyệt
    const leaderClanId = req.user.clanId;
    await pool.query(
      "UPDATE tbl_accounts SET status='ACTIVE', role=?, mappedMemberId=?, clanId=? WHERE id=?",
      [role, memberId || null, leaderClanId, req.params.id]
    );
    await pool.query(
      "INSERT INTO tbl_audit_logs (actorName,action,module,details) VALUES (?,?,?,?)",
      [req.user.fullName, "PHÂN QUYỀN & KÍCH HOẠT", "Accounts",
       `Trưởng họ kích hoạt [${rows[0].fullName}] → vai ${role}, dòng họ ${leaderClanId}`]
    );
    return res.json({ message: "Đã kích hoạt tài khoản." });
  } catch (err) {
    return res.status(500).json({ error: "Lỗi server." });
  }
});

// ── PUT /api/accounts/:id/reject ──────────────────────────────────────────────
router.put("/:id/reject", requireRole("ADMIN", "LEADER"), async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: "Vui lòng cung cấp lý do từ chối." });
  try {
    const [rows] = await pool.query("SELECT * FROM tbl_accounts WHERE id=?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    await pool.query(
      "UPDATE tbl_accounts SET status='REJECTED', rejectionReason=? WHERE id=?",
      [reason, req.params.id]
    );
    await pool.query(
      "INSERT INTO tbl_audit_logs (actorName,action,module,details) VALUES (?,?,?,?)",
      [req.user.fullName, "TỪ CHỐI TÀI KHOẢN", "Accounts",
       `Từ chối [${rows[0].fullName}] — Lý do: ${reason}`]
    );
    return res.json({ message: "Đã từ chối tài khoản." });
  } catch (err) {
    return res.status(500).json({ error: "Lỗi server." });
  }
});

// ── PUT /api/accounts/:id/block ───────────────────────────────────────────────
router.put("/:id/block", requireRole("ADMIN", "LEADER"), async (req, res) => {
  const { reason } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM tbl_accounts WHERE id=?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    // LEADER chỉ được khóa tài khoản trong dòng họ mình
    if (req.user.role === "LEADER" && rows[0].clanId !== req.user.clanId) {
      return res.status(403).json({ error: "Không có quyền thao tác tài khoản này." });
    }
    await pool.query(
      "UPDATE tbl_accounts SET status='BLOCKED', blockReason=? WHERE id=?",
      [reason || "Vô hiệu hóa bởi quản trị", req.params.id]
    );
    await pool.query(
      "INSERT INTO tbl_audit_logs (actorName,action,module,details) VALUES (?,?,?,?)",
      [req.user.fullName, "KHÓA TÀI KHOẢN", "Accounts",
       `Khóa [${rows[0].fullName}]${reason ? ` — ${reason}` : ""}`]
    );
    return res.json({ message: "Đã khóa tài khoản." });
  } catch (err) {
    return res.status(500).json({ error: "Lỗi server." });
  }
});

// ── PUT /api/accounts/:id/unblock ─────────────────────────────────────────────
router.put("/:id/unblock", requireRole("ADMIN", "LEADER"), async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM tbl_accounts WHERE id=?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    if (req.user.role === "LEADER" && rows[0].clanId !== req.user.clanId) {
      return res.status(403).json({ error: "Không có quyền thao tác tài khoản này." });
    }
    await pool.query(
      "UPDATE tbl_accounts SET status='ACTIVE', blockReason=NULL WHERE id=?",
      [req.params.id]
    );
    await pool.query(
      "INSERT INTO tbl_audit_logs (actorName,action,module,details) VALUES (?,?,?,?)",
      [req.user.fullName, "MỞ KHÓA TÀI KHOẢN", "Accounts", `Mở khóa [${rows[0].fullName}]`]
    );
    return res.json({ message: "Đã mở khóa tài khoản." });
  } catch (err) {
    return res.status(500).json({ error: "Lỗi server." });
  }
});

// ── PUT /api/accounts/:id/role ────────────────────────────────────────────────
router.put("/:id/role", requireRole("ADMIN", "LEADER"), async (req, res) => {
  const { role } = req.body;
  const allowed = ["ADMIN","LEADER","TREASURER","MEMBER","GUEST"];
  if (!allowed.includes(role)) return res.status(400).json({ error: "Vai trò không hợp lệ." });
  try {
    const [rows] = await pool.query("SELECT * FROM tbl_accounts WHERE id=?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    if (req.user.role === "LEADER" && rows[0].clanId !== req.user.clanId) {
      return res.status(403).json({ error: "Không có quyền thao tác tài khoản này." });
    }
    await pool.query("UPDATE tbl_accounts SET role=? WHERE id=?", [role, req.params.id]);
    await pool.query(
      "INSERT INTO tbl_audit_logs (actorName,action,module,details) VALUES (?,?,?,?)",
      [req.user.fullName, "ĐỔI VAI TRÒ", "Accounts",
       `Đổi vai trò [${rows[0].fullName}]: ${rows[0].role} → ${role}`]
    );
    return res.json({ message: "Đã cập nhật vai trò." });
  } catch (err) {
    return res.status(500).json({ error: "Lỗi server." });
  }
});

// ── GET /api/accounts/audit-logs ─────────────────────────────────────────────
router.get("/audit-logs", requireRole("ADMIN", "LEADER"), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page  = parseInt(req.query.page)  || 1;
    const offset = (page - 1) * limit;
    const [data] = await pool.query(
      "SELECT * FROM tbl_audit_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );
    const [[{ total }]] = await pool.query("SELECT COUNT(*) as total FROM tbl_audit_logs");
    return res.json({ data, total });
  } catch (err) {
    return res.status(500).json({ error: "Lỗi server." });
  }
});

// ── POST /api/accounts/create-leader — Admin tạo TK Trưởng họ (ACTIVE ngay) ──
router.post("/create-leader", requireRole("ADMIN"), async (req, res) => {
  const { fullName, phone, email, password, clanName, clanOrigin } = req.body;
  if (!fullName || !phone || !password) {
    return res.status(400).json({ error: "Thiếu thông tin bắt buộc." });
  }
  try {
    // Kiểm tra trùng SĐT/email
    const [dup] = await pool.query(
      "SELECT id FROM tbl_accounts WHERE phone=? OR email=? LIMIT 1",
      [phone, email || ""]
    );
    if (dup.length > 0) {
      return res.status(409).json({ error: "Số điện thoại hoặc email đã tồn tại." });
    }

    // Tạo dòng họ mới cho Trưởng họ này
    const clanId = `clan_${Date.now()}`;
    await pool.query(
      "INSERT INTO tbl_clans (id, name, origin, createdAt) VALUES (?,?,?,NOW())",
      [clanId, clanName || `Dòng họ ${fullName}`, clanOrigin || ""]
    );

    // Tạo tài khoản Trưởng họ — ACTIVE ngay, gắn clanId
    const bcrypt = require("bcryptjs");
    const hashed = await bcrypt.hash(password, 10);
    const id = `acc_leader_${Date.now()}`;
    await pool.query(
      `INSERT INTO tbl_accounts
        (id,fullName,phone,email,password,gender,role,status,inviteCode,clanId,registeredAt)
       VALUES (?,?,?,?,?,'MALE','LEADER','ACTIVE','SYSTEM_ROOT',?,NOW())`,
      [id, fullName, phone, email || `${phone}@dongho.com`, hashed, clanId]
    );

    await pool.query(
      "INSERT INTO tbl_audit_logs (actorName,action,module,details) VALUES (?,?,?,?)",
      [req.user.fullName, "TẠO TÀI KHOẢN TRƯỞNG HỌ", "Accounts",
       `Admin tạo TK Trưởng họ [${fullName}] — Dòng họ: ${clanName || clanId}`]
    );
    return res.status(201).json({
      message: `Tạo tài khoản Trưởng họ "${fullName}" thành công.`,
      clanId,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Lỗi server." });
  }
});

// ── PUT /api/accounts/:id/edit ────────────────────────────────────────────────
router.put("/:id/edit", requireRole("LEADER", "ADMIN"), async (req, res) => {
  const { fullName, phone, email, birthDate, gender, hometown, address, notes, role } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM tbl_accounts WHERE id=?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    if (req.user.role === "LEADER" && rows[0].clanId !== req.user.clanId) {
      return res.status(403).json({ error: "Không có quyền sửa tài khoản này." });
    }
    await pool.query(
      `UPDATE tbl_accounts SET fullName=?,phone=?,email=?,birthDate=?,gender=?,
       hometown=?,address=?,notes=? WHERE id=?`,
      [fullName||rows[0].fullName, phone||rows[0].phone, email||rows[0].email,
       birthDate||rows[0].birthDate, gender||rows[0].gender,
       hometown??rows[0].hometown, address??rows[0].address,
       notes??rows[0].notes, req.params.id]
    );
    if (role) {
      await pool.query("UPDATE tbl_accounts SET role=? WHERE id=?", [role, req.params.id]);
    }
    await pool.query(
      "INSERT INTO tbl_audit_logs (actorName,action,module,details) VALUES (?,?,?,?)",
      [req.user.fullName, "SỬA THÔNG TIN TÀI KHOẢN", "Accounts",
       `Cập nhật hồ sơ [${rows[0].fullName}]`]
    );
    return res.json({ message: "Cập nhật thành công." });
  } catch (err) {
    return res.status(500).json({ error: "Lỗi server." });
  }
});

// ── PUT /api/accounts/:id/request-delete ─────────────────────────────────────
router.put("/:id/request-delete", requireRole("LEADER"), async (req, res) => {
  const { reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ error: "Vui lòng nêu rõ lý do." });
  try {
    const [rows] = await pool.query("SELECT * FROM tbl_accounts WHERE id=?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    if (rows[0].role === "ADMIN") return res.status(403).json({ error: "Không thể yêu cầu xóa Admin." });
    if (rows[0].clanId !== req.user.clanId) {
      return res.status(403).json({ error: "Không có quyền thao tác tài khoản này." });
    }
    await pool.query(
      "UPDATE tbl_accounts SET status='PENDING_DELETE', blockReason=? WHERE id=?",
      [reason, req.params.id]
    );
    await pool.query(
      "INSERT INTO tbl_audit_logs (actorName,action,module,details) VALUES (?,?,?,?)",
      [req.user.fullName, "YÊU CẦU XÓA TÀI KHOẢN", "Accounts",
       `Trưởng họ yêu cầu xóa [${rows[0].fullName}] — Lý do: ${reason}`]
    );
    return res.json({ message: "Đã gửi yêu cầu xóa tới Admin." });
  } catch (err) {
    return res.status(500).json({ error: "Lỗi server." });
  }
});

// ── DELETE /api/accounts/:id — Admin duyệt xóa ───────────────────────────────
router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM tbl_accounts WHERE id=?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy." });
    if (rows[0].role === "ADMIN") return res.status(403).json({ error: "Không thể xóa Admin." });
    await pool.query("DELETE FROM tbl_accounts WHERE id=?", [req.params.id]);
    await pool.query(
      "INSERT INTO tbl_audit_logs (actorName,action,module,details) VALUES (?,?,?,?)",
      [req.user.fullName, "XÓA TÀI KHOẢN", "Accounts",
       `Admin xóa vĩnh viễn [${rows[0].fullName}]`]
    );
    return res.json({ message: "Đã xóa tài khoản." });
  } catch (err) {
    return res.status(500).json({ error: "Lỗi server." });
  }
});

// ── PUT /api/accounts/:id/reject-delete ──────────────────────────────────────
router.put("/:id/reject-delete", requireRole("ADMIN"), async (req, res) => {
  const { reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ error: "Vui lòng nêu lý do." });
  try {
    const [rows] = await pool.query("SELECT * FROM tbl_accounts WHERE id=?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy." });
    await pool.query(
      "UPDATE tbl_accounts SET status='ACTIVE', blockReason=NULL, rejectionReason=? WHERE id=?",
      [`[Từ chối xóa] ${reason}`, req.params.id]
    );
    await pool.query(
      "INSERT INTO tbl_audit_logs (actorName,action,module,details) VALUES (?,?,?,?)",
      [req.user.fullName, "TỪ CHỐI XÓA TÀI KHOẢN", "Accounts",
       `Admin từ chối xóa [${rows[0].fullName}] — Lý do: ${reason}`]
    );
    return res.json({ message: "Đã từ chối, tài khoản phục hồi." });
  } catch (err) {
    return res.status(500).json({ error: "Lỗi server." });
  }
});

module.exports = router;