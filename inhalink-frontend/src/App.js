import "./App.css";
import { useState, useEffect, useRef, createContext, useContext } from "react";
import { api, saveToken, clearToken } from "./api";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import {
  BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation,
} from "react-router-dom";

function formatPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

const UserContext = createContext(null);
function useUser() { return useContext(UserContext); }

function RequireAuth({ children }) {
  const { currentUser, authLoading } = useUser();
  if (authLoading) return null;
  if (!currentUser) return <Navigate to="/" replace />;
  return children;
}

// ── 공유 햄버거 메뉴 ──────────────────────────────────────
function HamburgerMenu() {
  const { setCurrentUser } = useUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const logout = () => { clearToken(); setCurrentUser(null); navigate("/"); };

  return (
    <>
      <button className="hamburger" onClick={() => setOpen(!open)} style={{ position: "fixed", top: "16px", left: "16px", zIndex: 200 }}>☰</button>
      {open && (
        <>
          <div className="menu-bg" onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 201 }} />
          <div className="side-menu" style={{ position: "fixed", top: 0, left: 0, zIndex: 202, height: "100vh" }}>
            <h2 className="side-menu-title">InhaLink</h2>
            {[
              ["🏠 홈", "/home"],
              ["🍚 밥친구 찾기", "/meal"],
              ["🏆 팀플·공모전", "/posts"],
              ["👤 프로필 수정", "/profile/edit"],
              ["📋 내 모집글", "/my-posts"],
              ["📝 내 지원 현황", "/my-applications"],
              ["💬 채팅", "/chat"],
            ].map(([label, path]) => (
              <p key={path} onClick={() => { setOpen(false); navigate(path); }} style={{ cursor: "pointer", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>{label}</p>
            ))}
            <p onClick={logout} style={{ cursor: "pointer", padding: "10px 0", color: "#e24b4a" }}>🚪 로그아웃</p>
          </div>
        </>
      )}
    </>
  );
}

// ── 지원자 상세 모달 ──────────────────────────────────────
function ApplicantModal({ app, onClose, onAccept, onReject, isMeal }) {
  if (!app) return null;
  const isPending = app.status === "PENDING";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "320px", maxWidth: "90vw" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: "16px", fontSize: "16px" }}>지원자 상세정보</h3>
        <p style={{ fontSize: "14px", marginBottom: "8px" }}><strong>이름:</strong> {app.applicantName}</p>
        <p style={{ fontSize: "14px", marginBottom: "8px" }}><strong>학과:</strong> {app.applicantDepartment}</p>
        <p style={{ fontSize: "14px", marginBottom: "8px" }}><strong>연락처:</strong> {app.applicantContact}</p>
        {!isMeal && app.applicantDomains && <p style={{ fontSize: "14px", marginBottom: "8px", wordBreak: "break-word" }}><strong>관심분야:</strong> {app.applicantDomains}</p>}
        {!isMeal && app.applicantActivities && <p style={{ fontSize: "14px", marginBottom: "8px", wordBreak: "break-word", overflowWrap: "break-word" }}><strong>활동이력:</strong> {app.applicantActivities}</p>}
        <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
          {isPending ? (
            <>
              <button onClick={() => { onAccept(app.id); onClose(); }} style={{ flex: 1, background: "#10b981", color: "#fff", border: "none", borderRadius: "8px", padding: "10px", cursor: "pointer" }}>수락</button>
              <button onClick={() => { onReject(app.id); onClose(); }} style={{ flex: 1, background: "#e24b4a", color: "#fff", border: "none", borderRadius: "8px", padding: "10px", cursor: "pointer" }}>거절</button>
            </>
          ) : (
            <p style={{ color: app.status === "ACCEPTED" ? "#10b981" : "#e24b4a", fontWeight: 600 }}>
              {app.status === "ACCEPTED" ? "수락됨" : "거절됨"}
            </p>
          )}
          <button onClick={onClose} style={{ flex: 1, background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "10px", cursor: "pointer" }}>닫기</button>
        </div>
      </div>
    </div>
  );
}

// ── 지원자 목록 섹션 ──────────────────────────────────────
function ApplicantList({ applications, setApplications, onAccept, onReject, isMeal }) {
  const [selectedApp, setSelectedApp] = useState(null);
  return (
    <div style={{ marginTop: "24px" }}>
      <h3 style={{ fontSize: "15px", marginBottom: "12px" }}>지원자 목록</h3>
      {applications.length === 0 && <p style={{ color: "#6b7280", fontSize: "14px" }}>아직 지원자가 없습니다.</p>}
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {applications.map((app) => (
          <div key={app.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, flex: 1, cursor: "pointer" }} onClick={() => setSelectedApp(app)}>{app.applicantName}</span>
            {app.status === "PENDING" ? (
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => onAccept(app.id)} style={{ padding: "5px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>수락</button>
                <button onClick={() => onReject(app.id)} style={{ padding: "5px 12px", background: "#e24b4a", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>거절</button>
              </div>
            ) : (
              <span style={{ fontSize: "13px", color: app.status === "ACCEPTED" ? "#10b981" : "#9ca3af" }}>
                {app.status === "ACCEPTED" ? "수락됨" : "거절됨"}
              </span>
            )}
          </div>
        ))}
      </div>
      <ApplicantModal
        app={selectedApp}
        isMeal={isMeal}
        onClose={() => setSelectedApp(null)}
        onAccept={(id) => { onAccept(id); setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status: "ACCEPTED" } : a)); }}
        onReject={(id) => { onReject(id); setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status: "REJECTED" } : a)); }}
      />
    </div>
  );
}

// ── 앱 루트 ──────────────────────────────────────────────
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(!!localStorage.getItem("token"));
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    api.getMe()
      .then((profile) => {
        setCurrentUser({ studentId: profile.studentId, name: profile.name, gender: profile.gender || "MALE", contact: formatPhone(profile.contact || "") });
      })
      .catch(() => clearToken())
      .finally(() => setAuthLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPosts = async () => {
    try { const data = await api.getPosts(); setPosts(data || []); } catch { setPosts([]); }
  };

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, authLoading, posts, setPosts, selectedPost, setSelectedPost, loadPosts }}>
      <BrowserRouter>
        <div className="app">
          <div className="container">
            <h1 className="logo">InhaLink</h1>
            <p className="subtitle">인하대학교 학생 매칭 플랫폼</p>
            <Routes>
              <Route path="/" element={<StartPage />} />
              <Route path="/login" element={<LoginBox />} />
              <Route path="/signup" element={<SignupBox />} />
              <Route path="/profile/create" element={<RequireAuth><ProfileCreateBox /></RequireAuth>} />
              <Route path="/profile/edit" element={<RequireAuth><ProfileEditBox /></RequireAuth>} />
              <Route path="/home" element={<RequireAuth><HomePage /></RequireAuth>} />
              <Route path="/posts" element={<RequireAuth><TeamMainPage /></RequireAuth>} />
              <Route path="/posts/write" element={<RequireAuth><TeamWritePage /></RequireAuth>} />
              <Route path="/posts/:id/edit" element={<RequireAuth><TeamEditPage /></RequireAuth>} />
              <Route path="/posts/:id" element={<RequireAuth><TeamDetailPage /></RequireAuth>} />
              <Route path="/meal" element={<RequireAuth><MealPage /></RequireAuth>} />
              <Route path="/meal/write" element={<RequireAuth><MealWritePage /></RequireAuth>} />
              <Route path="/meal/:postId/edit" element={<RequireAuth><MealEditPage /></RequireAuth>} />
              <Route path="/meal/:postId" element={<RequireAuth><MealDetailPage /></RequireAuth>} />
              <Route path="/my-posts" element={<RequireAuth><MyPostsPage /></RequireAuth>} />
              <Route path="/my-applications" element={<RequireAuth><MyApplicationsPage /></RequireAuth>} />
              <Route path="/chat" element={<RequireAuth><ChatListPage /></RequireAuth>} />
              <Route path="/chat/:roomId" element={<RequireAuth><ChatRoomPage /></RequireAuth>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </UserContext.Provider>
  );
}

// ── 시작 화면 ─────────────────────────────────────────────
function StartPage() {
  const navigate = useNavigate();
  return (
    <div className="box start-box">
      <div className="start-icon">🔗</div>
      <h2>인하링크에 오신 걸 환영합니다</h2>
      <p className="start-text">밥친구부터 공모전 팀원까지<br />인하대 학생들을 연결해주는 플랫폼</p>
      <button onClick={() => navigate("/login")}>로그인</button>
      <button className="outline-btn" onClick={() => navigate("/signup")}>회원가입</button>
    </div>
  );
}

// ── 로그인 ────────────────────────────────────────────────
function LoginBox() {
  const { setCurrentUser } = useUser();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!studentId.trim() || !password.trim()) { setError("아이디와 비밀번호를 입력해주세요."); return; }
    setLoading(true); setError("");
    try {
      const data = await api.login(studentId, password);
      saveToken(data.token);
      const profile = data.profile;
      setCurrentUser({ studentId: profile.studentId, name: profile.name, gender: profile.gender || "MALE", contact: formatPhone(profile.contact || "") });
      navigate(profile.profileComplete ? "/home" : "/profile/create");
    } catch { setError("학번 또는 비밀번호가 올바르지 않습니다."); }
    finally { setLoading(false); }
  };

  return (
    <div className="box">
      <h2>로그인</h2>
      <input type="text" placeholder="학번" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
      <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p style={{ color: "#e24b4a", fontSize: "13px", margin: "4px 0" }}>{error}</p>}
      <button onClick={handleLogin} disabled={loading}>{loading ? "확인 중..." : "로그인"}</button>
      <button className="back" onClick={() => navigate("/")}>뒤로가기</button>
    </div>
  );
}

// ── 회원가입 ──────────────────────────────────────────────
function SignupBox() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", name: "", studentId: "", gender: "", contact: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSignup = async () => {
    const { email, studentId, password, name, gender, contact } = form;
    if (!email || !studentId || !password || !name || !gender || !contact) { setError("모든 필수 항목을 입력해주세요."); return; }
    if (!email.endsWith("@inha.ac.kr") && !email.endsWith("@inha.edu")) { setError("인하대학교 이메일만 사용 가능합니다."); return; }
    setLoading(true); setError("");
    try {
      await api.signup({ email, password, name, studentId, gender, contact });
      alert("회원가입이 완료되었습니다!"); navigate("/login");
    } catch (e) { setError(Object.values(e || {}).join(" / ") || "회원가입에 실패했습니다."); }
    finally { setLoading(false); }
  };

  return (
    <div className="box">
      <h2>회원가입</h2>
      <input type="text" placeholder="이메일 (@inha.ac.kr 또는 @inha.edu)" value={form.email} onChange={set("email")} />
      <input type="text" placeholder="학번" value={form.studentId} onChange={set("studentId")} />
      <input type="password" placeholder="비밀번호 (8자 이상)" value={form.password} onChange={set("password")} />
      <input type="text" placeholder="이름" value={form.name} onChange={set("name")} />
      <select value={form.gender} onChange={set("gender")} style={{ width: "100%", padding: "13px", marginBottom: "14px", border: "1px solid #ddd", borderRadius: "12px", fontSize: "15px" }}>
        <option value="">성별 선택</option>
        <option value="MALE">남성</option>
        <option value="FEMALE">여성</option>
      </select>
      <input type="text" placeholder="연락처 (010-xxxx-xxxx)" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: formatPhone(e.target.value) }))} />
      {error && <p style={{ color: "#e24b4a", fontSize: "13px", margin: "4px 0" }}>{error}</p>}
      <button onClick={handleSignup} disabled={loading}>{loading ? "처리 중..." : "회원가입 완료"}</button>
      <button className="back" onClick={() => navigate("/")}>뒤로가기</button>
    </div>
  );
}

// ── 최초 프로필 작성 ──────────────────────────────────────
function ProfileCreateBox() {
  const { currentUser, setCurrentUser } = useUser();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: currentUser?.name || "", gender: currentUser?.gender || "MALE", contact: formatPhone(currentUser?.contact || ""), department: "", domains: "", activities: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name || !form.contact || !form.department || !form.domains) { setError("이름, 연락처, 학과, 관심분야는 필수입니다."); return; }
    setLoading(true); setError("");
    try {
      const updated = await api.createProfile(currentUser.studentId, form);
      setCurrentUser({ ...currentUser, name: updated.name });
      navigate("/home");
    } catch (e) { setError(Object.values(e || {}).join(" / ") || "프로필 작성에 실패했습니다."); }
    finally { setLoading(false); }
  };

  return (
    <div className="box">
      <h2>프로필 작성</h2>
      <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px" }}>서비스 이용을 위해 프로필을 작성해주세요.</p>
      <input type="text" placeholder="이름 *" value={form.name} onChange={set("name")} />
      <select value={form.gender} onChange={set("gender")} style={{ width: "100%", padding: "13px", marginBottom: "14px", border: "1px solid #ddd", borderRadius: "12px", fontSize: "15px" }}>
        <option value="MALE">남성</option>
        <option value="FEMALE">여성</option>
      </select>
      <input type="text" placeholder="연락처 * (010-xxxx-xxxx)" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: formatPhone(e.target.value) }))} />
      <input type="text" placeholder="학과 *" value={form.department} onChange={set("department")} />
      <input type="text" placeholder="관심 분야 * (예: 백엔드, AI, 디자인)" value={form.domains} onChange={set("domains")} />
      <textarea rows="4" placeholder="대외활동 이력 (선택)" value={form.activities} onChange={set("activities")} style={{ wordBreak: "break-word", overflowWrap: "break-word" }} />
      {error && <p style={{ color: "#e24b4a", fontSize: "13px", margin: "4px 0" }}>{error}</p>}
      <button onClick={handleSubmit} disabled={loading}>{loading ? "저장 중..." : "프로필 작성 완료"}</button>
    </div>
  );
}

// ── 프로필 수정 ───────────────────────────────────────────
function ProfileEditBox() {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", gender: "", contact: "", department: "", domains: "", activities: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getProfile(currentUser.studentId).then((p) => {
      setForm({ name: p.name || "", gender: p.gender || "", contact: formatPhone(p.contact || ""), department: p.department || "", domains: p.domains || "", activities: p.activities || "" });
    }).catch(() => {});
  }, [currentUser.studentId]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      await api.updateProfile(currentUser.studentId, form);
      alert("프로필이 수정되었습니다."); navigate("/home");
    } catch (e) { setError(Object.values(e || {}).join(" / ") || "프로필 수정에 실패했습니다."); }
    finally { setLoading(false); }
  };

  return (
    <div className="box">
      <HamburgerMenu />
      <h2>프로필 수정</h2>
      <input type="text" placeholder="이름" value={form.name} onChange={set("name")} />
      <select value={form.gender} onChange={set("gender")} style={{ width: "100%", padding: "13px", marginBottom: "14px", border: "1px solid #ddd", borderRadius: "12px", fontSize: "15px" }}>
        <option value="MALE">남성</option>
        <option value="FEMALE">여성</option>
      </select>
      <input type="text" placeholder="연락처" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: formatPhone(e.target.value) }))} />
      <input type="text" placeholder="학과" value={form.department} onChange={set("department")} />
      <input type="text" placeholder="관심 분야" value={form.domains} onChange={set("domains")} />
      <textarea rows="4" placeholder="대외활동 이력" value={form.activities} onChange={set("activities")} style={{ wordBreak: "break-word", overflowWrap: "break-word" }} />
      {error && <p style={{ color: "#e24b4a", fontSize: "13px", margin: "4px 0" }}>{error}</p>}
      <button onClick={handleSubmit} disabled={loading}>{loading ? "저장 중..." : "수정 완료"}</button>
      <button className="back" onClick={() => navigate("/home")}>취소</button>
    </div>
  );
}

// ── 홈 ────────────────────────────────────────────────────
function HomePage() {
  const { loadPosts } = useUser();
  const navigate = useNavigate();
  return (
    <>
      <HamburgerMenu />
      <div className="service-wrap">
        <div className="service-card" onClick={() => navigate("/meal")}>
          <div className="icon green">👥</div>
          <h2>밥친구 찾기</h2>
          <p>같이 식사할 친구를 찾아보세요</p>
        </div>
        <div className="service-card" onClick={() => { loadPosts(); navigate("/posts"); }}>
          <div className="icon purple">🏆</div>
          <h2>팀플·공모전</h2>
          <p>함께 도전할 팀원을 구해요</p>
        </div>
      </div>
    </>
  );
}

// ── 팀플·공모전 목록 ──────────────────────────────────────
function TeamMainPage() {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [allPosts, setAllPosts] = useState([]);
  const [myAppPostIds, setMyAppPostIds] = useState(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getPosts().then(setAllPosts).catch(() => {});
    api.getMyApplications().then((apps) => setMyAppPostIds(new Set(apps.map((a) => a.postId)))).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = allPosts.filter((p) => {
    if (p.writerStudentId === currentUser?.studentId) return false;
    if (myAppPostIds.has(p.id)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || (p.projectName && p.projectName.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="box wide page-box">
      <HamburgerMenu />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ margin: 0 }}>팀플·공모전</h2>
        <button className="small-btn" onClick={() => navigate("/posts/write")} style={{ width: "auto", padding: "8px 16px" }}>모집글 작성</button>
      </div>
      <input type="text" placeholder="제목 또는 프로젝트명 검색" value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: "12px" }} />
      <div className="simple-post-list" style={{ maxHeight: "420px", overflowY: "auto" }}>
        {filtered.length === 0 && <p style={{ color: "#6b7280", fontSize: "14px", padding: "12px 0" }}>모집글이 없습니다.</p>}
        {filtered.map((post) => (
          <div className="simple-post" key={post.id} onClick={() => navigate(`/posts/${post.id}`)} style={{ cursor: "pointer" }}>
            <div style={{ flex: 1 }}>
              <h3>{post.title}</h3>
              <p style={{ fontSize: "13px", color: "#6b7280" }}>{post.categoryDescription} · {post.projectName} · {post.maxMembers}명 모집</p>
            </div>
            <span style={{ fontSize: "12px", color: "#10b981", fontWeight: 600, marginLeft: "8px", whiteSpace: "nowrap" }}>{post.statusDescription}</span>
          </div>
        ))}
      </div>
      <button className="back" onClick={() => navigate("/home")}>홈으로</button>
    </div>
  );
}

// ── 팀플·공모전 모집글 작성 ───────────────────────────────
function TeamWritePage() {
  const { currentUser, loadPosts } = useUser();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", category: "", projectName: "", content: "", maxMembers: "", deadline: "", teamFormationDate: "", preferredQualifications: "", message: "", activityMethod: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    const required = { title: "제목", category: "카테고리", projectName: "프로젝트/공모전명", content: "내용", maxMembers: "모집 인원", deadline: "마감일", activityMethod: "활동 방식" };
    const missing = Object.entries(required).filter(([k]) => !form[k]?.toString().trim()).map(([, v]) => v);
    if (missing.length > 0) { setError(`필수 항목을 입력해주세요: ${missing.join(", ")}`); return; }
    setLoading(true); setError(""); setFieldErrors({});
    try {
      await api.createPost(currentUser.studentId, { ...form, maxMembers: Number(form.maxMembers), deadline: form.deadline + ":00", teamFormationDate: form.teamFormationDate ? form.teamFormationDate + ":00" : null });
      alert("모집글이 등록되었습니다!"); await loadPosts(); navigate("/posts");
    } catch (e) {
      if (typeof e === "object" && !e.message) { setFieldErrors(e); setError("입력 정보를 확인해주세요."); }
      else { setError(e?.message || "모집글 등록에 실패했습니다."); }
    } finally { setLoading(false); }
  };

  const fe = (k) => fieldErrors[k] ? <p style={{ color: "#e24b4a", fontSize: "12px", margin: "-10px 0 8px" }}>{fieldErrors[k]}</p> : null;

  return (
    <div className="box">
      <HamburgerMenu />
      <h2>공모전 모집글 작성</h2>
      <input type="text" placeholder="제목 *" value={form.title} onChange={set("title")} />{fe("title")}
      <select value={form.category} onChange={set("category")} style={{ width: "100%", padding: "13px", marginBottom: "14px", border: "1px solid #ddd", borderRadius: "12px", fontSize: "15px" }}>
        <option value="">카테고리 선택 *</option>
        <option value="CONTEST">공모전</option>
        <option value="TEAM_PROJECT">팀플</option>
        <option value="PROJECT">프로젝트</option>
      </select>
      <input type="text" placeholder="프로젝트/공모전 이름 *" value={form.projectName} onChange={set("projectName")} />{fe("projectName")}
      <textarea rows="4" placeholder="내용 *" value={form.content} onChange={set("content")} />{fe("content")}
      <input type="number" placeholder="모집 인원 *" value={form.maxMembers} onChange={set("maxMembers")} />{fe("maxMembers")}
      <label style={{ fontSize: "13px", color: "#6b7280" }}>모집 마감일 *</label>
      <input type="datetime-local" value={form.deadline} onChange={set("deadline")} />{fe("deadline")}
      <label style={{ fontSize: "13px", color: "#6b7280" }}>팀 결성 희망일</label>
      <input type="datetime-local" value={form.teamFormationDate} onChange={set("teamFormationDate")} />
      <select value={form.activityMethod} onChange={set("activityMethod")} style={{ width: "100%", padding: "13px", marginBottom: "14px", border: "1px solid #ddd", borderRadius: "12px", fontSize: "15px" }}>
        <option value="">활동 방식 선택 *</option>
        <option value="ONLINE">온라인</option>
        <option value="OFFLINE">오프라인</option>
        <option value="BOTH">온/오프라인 병행</option>
      </select>
      <textarea rows="3" placeholder="우대사항 (선택)" value={form.preferredQualifications} onChange={set("preferredQualifications")} />
      <textarea rows="3" placeholder="하고 싶은 말 (선택)" value={form.message} onChange={set("message")} />
      {error && <p style={{ color: "#e24b4a", fontSize: "13px", margin: "4px 0" }}>{error}</p>}
      <button onClick={handleSubmit} disabled={loading}>{loading ? "등록 중..." : "등록"}</button>
      <button className="back" onClick={() => navigate("/posts")}>취소</button>
    </div>
  );
}

// ── 팀플·공모전 상세 ──────────────────────────────────────
function TeamDetailPage() {
  const { currentUser } = useUser();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromMyApps = location.state?.fromMyApps === true;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [applyMsg, setApplyMsg] = useState("");
  const isOwner = post && currentUser?.studentId === post.writerStudentId;
  const isClosed = post?.statusDescription === "마감";

  useEffect(() => {
    api.getPost(id).then(setPost).catch(() => navigate("/posts")).finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if (isOwner && post) {
      api.getApplications(post.id).then(setApplications).catch(() => {});
    }
  }, [isOwner, post]);

  const handleAccept = (appId) => {
    api.acceptApplication(appId)
      .then(() => setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: "ACCEPTED" } : a)))
      .catch((e) => alert(e?.message || "오류가 발생했습니다."));
  };
  const handleReject = (appId) => {
    api.rejectApplication(appId)
      .then(() => setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: "REJECTED" } : a)))
      .catch((e) => alert(e?.message || "오류가 발생했습니다."));
  };

  if (loading) return <div className="box wide"><p style={{ color: "#6b7280" }}>불러오는 중...</p></div>;
  if (!post) return null;

  return (
    <div className="box wide">
      <HamburgerMenu />
      <h2>공모전 모집글 상세</h2>
      <div className="post">
        <h3 style={{ wordBreak: "break-word" }}>{post.title}</h3>
        <p>카테고리: {post.categoryDescription}</p>
        <p>프로젝트명: {post.projectName}</p>
        <p>작성자: {post.writerName}</p>
        <p>모집 인원: {post.maxMembers}명</p>
        <p>활동 방식: {post.activityMethodDescription}</p>
        <p>마감일: {new Date(post.deadline).toLocaleDateString("ko-KR")}</p>
        {post.preferredQualifications && <p style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>우대사항: {post.preferredQualifications}</p>}
        <p style={{ marginTop: "12px", wordBreak: "break-word", overflowWrap: "break-word" }}>{post.content}</p>
        {post.message && <p style={{ color: "#6b7280", wordBreak: "break-word", overflowWrap: "break-word" }}>{post.message}</p>}

        {isOwner && !isClosed && (
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button onClick={() => navigate(`/posts/${post.id}/edit`)} style={{ background: "#6c63ff" }}>수정</button>
            <button onClick={() => {
              if (!window.confirm("모집을 마감하시겠습니까?")) return;
              api.closePost(post.id, currentUser.studentId)
                .then(() => { alert("마감되었습니다."); setPost((p) => ({ ...p, statusDescription: "마감" })); })
                .catch(() => alert("마감에 실패했습니다."));
            }} style={{ background: "#f59e0b" }}>조기마감</button>
            <button onClick={() => {
              if (!window.confirm("모집글을 삭제하시겠습니까? 복구할 수 없습니다.")) return;
              api.cancelPost(post.id)
                .then(() => { alert("삭제되었습니다."); navigate("/posts"); })
                .catch((e) => alert(e?.message || "삭제에 실패했습니다."));
            }} style={{ background: "#e24b4a" }}>삭제</button>
          </div>
        )}
        {!isOwner && !fromMyApps && (
          <>
            <button onClick={() => {
              api.applyPost(post.id)
                .then(() => setApplyMsg("지원이 완료되었습니다!"))
                .catch((e) => setApplyMsg(e?.message || "지원에 실패했습니다."));
            }}>지원하기</button>
            {applyMsg && <p style={{ fontSize: "13px", marginTop: "8px", color: applyMsg.includes("완료") ? "#10b981" : "#e24b4a" }}>{applyMsg}</p>}
          </>
        )}
      </div>

      {isOwner && (
        <>
          <ApplicantList applications={applications} setApplications={setApplications} onAccept={handleAccept} onReject={handleReject} isMeal={false} />
          {isClosed && (
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button onClick={() => {
                if (!window.confirm("수락된 지원자들과 채팅방을 개설하시겠습니까?")) return;
                api.confirmPost(post.id)
                  .then(() => { alert("채팅방이 개설되었습니다!"); navigate("/chat"); })
                  .catch((e) => alert(e?.message || "오류가 발생했습니다."));
              }} style={{ flex: 1, background: "#10b981" }}>그룹 확정</button>
              <button onClick={() => navigate("/my-posts")} style={{ flex: 1, background: "#6b7280" }}>보류</button>
              <button onClick={() => {
                if (!window.confirm("모집을 취소하면 복구할 수 없습니다. 진행하시겠습니까?")) return;
                api.cancelPost(post.id)
                  .then(() => { alert("모집이 취소되었습니다."); navigate("/my-posts"); })
                  .catch((e) => alert(e?.message || "오류가 발생했습니다."));
              }} style={{ flex: 1, background: "#e24b4a" }}>모집 취소</button>
            </div>
          )}
        </>
      )}

      <button className="back" onClick={() => navigate(-1)}>뒤로가기</button>
    </div>
  );
}

// ── 밥친구 목록 ───────────────────────────────────────────
function MealPage() {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [allPosts, setAllPosts] = useState([]);
  const [myAppPostIds, setMyAppPostIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getMealPosts().then(setAllPosts).catch(() => {}).finally(() => setLoading(false));
    api.getMyMealApplications().then((apps) => setMyAppPostIds(new Set(apps.map((a) => a.postId)))).catch(() => {});
  }, []);

  const filtered = allPosts.filter((p) => {
    if (p.writerStudentId === currentUser?.studentId) return false;
    if (myAppPostIds.has(p.id)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || (p.location && p.location.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="box wide page-box">
      <HamburgerMenu />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ margin: 0 }}>밥친구</h2>
        <button className="small-btn" onClick={() => navigate("/meal/write")} style={{ width: "auto", padding: "8px 16px" }}>모집글 작성</button>
      </div>
      <input type="text" placeholder="제목 또는 장소 검색" value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: "12px" }} />
      <div className="simple-post-list" style={{ maxHeight: "420px", overflowY: "auto" }}>
        {loading && <p style={{ color: "#6b7280", fontSize: "14px" }}>불러오는 중...</p>}
        {!loading && filtered.length === 0 && <p style={{ color: "#6b7280", fontSize: "14px", padding: "12px 0" }}>모집글이 없습니다.</p>}
        {filtered.map((post) => (
          <div className="simple-post" key={post.id} onClick={() => navigate(`/meal/${post.id}`)} style={{ cursor: "pointer" }}>
            <div style={{ flex: 1 }}>
              <h3>{post.title}</h3>
              <p style={{ fontSize: "13px", color: "#6b7280" }}>{post.location} · {new Date(post.mealTime).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} · 최대 {post.maxMembers}명</p>
            </div>
            <span style={{ fontSize: "12px", color: "#10b981", fontWeight: 600, marginLeft: "8px", whiteSpace: "nowrap" }}>{post.status === "RECRUITING" ? "모집중" : "마감"}</span>
          </div>
        ))}
      </div>
      <button className="back" onClick={() => navigate("/home")}>홈으로</button>
    </div>
  );
}

// ── 밥친구 작성 ───────────────────────────────────────────
function MealWritePage() {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", location: "", mealTime: "", maxMembers: "", content: "" });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.title || !form.location || !form.mealTime || !form.maxMembers) { alert("제목, 장소, 시간, 모집인원은 필수입니다."); return; }
    setLoading(true);
    try {
      await api.createMealPost(currentUser.studentId, { ...form, maxMembers: parseInt(form.maxMembers) });
      alert("밥친구 모집글이 등록되었습니다!"); navigate("/meal");
    } catch { alert("등록에 실패했습니다."); }
    finally { setLoading(false); }
  };

  return (
    <div className="box">
      <HamburgerMenu />
      <h2>밥친구 모집글 작성</h2>
      <input type="text" placeholder="제목" value={form.title} onChange={set("title")} />
      <input type="text" placeholder="장소" value={form.location} onChange={set("location")} />
      <input type="datetime-local" value={form.mealTime} onChange={set("mealTime")} style={{ width: "100%", padding: "13px", marginBottom: "14px", border: "1px solid #ddd", borderRadius: "12px", fontSize: "15px" }} />
      <input type="number" placeholder="모집 인원 (최소 2명)" min="2" value={form.maxMembers} onChange={set("maxMembers")} />
      <textarea rows="5" placeholder="내용 (선택)" value={form.content} onChange={set("content")} style={{ width: "100%", padding: "13px", marginBottom: "14px", border: "1px solid #ddd", borderRadius: "12px", fontSize: "15px", resize: "vertical" }} />
      <button onClick={handleSubmit} disabled={loading}>{loading ? "처리 중..." : "등록"}</button>
      <button className="back" onClick={() => navigate("/meal")}>취소</button>
    </div>
  );
}

// ── 밥친구 상세 ───────────────────────────────────────────
function MealDetailPage() {
  const { postId } = useParams();
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const fromMyApps = location.state?.fromMyApps === true;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [applyMsg, setApplyMsg] = useState("");
  const isOwner = post && currentUser?.studentId === post.writerStudentId;
  const isClosed = post?.status === "CLOSED";

  useEffect(() => {
    api.getMealPost(postId).then(setPost).catch(() => navigate("/meal")).finally(() => setLoading(false));
  }, [postId, navigate]);

  useEffect(() => {
    if (isOwner && post) {
      api.getMealApplications(post.id).then(setApplications).catch(() => {});
    }
  }, [isOwner, post]);

  const handleAccept = (appId) => {
    api.acceptMealApplication(appId)
      .then(() => setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: "ACCEPTED" } : a)))
      .catch((e) => alert(e?.message || "오류"));
  };
  const handleReject = (appId) => {
    api.rejectMealApplication(appId)
      .then(() => setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: "REJECTED" } : a)))
      .catch((e) => alert(e?.message || "오류"));
  };

  if (loading) return <div className="box wide"><p style={{ color: "#6b7280" }}>불러오는 중...</p></div>;
  if (!post) return null;

  return (
    <div className="box wide">
      <HamburgerMenu />
      <h2>밥친구 모집글 상세</h2>
      <div className="post">
        <h3 style={{ wordBreak: "break-word" }}>{post.title}</h3>
        <p>장소: {post.location}</p>
        <p>시간: {new Date(post.mealTime).toLocaleString("ko-KR")}</p>
        <p>최대 인원: {post.maxMembers}명</p>
        <p>작성자: {post.writerName}</p>
        <p>상태: <span style={{ color: isClosed ? "#e24b4a" : "#10b981", fontWeight: 600 }}>{isClosed ? "마감" : "모집중"}</span></p>
        {post.content && <p style={{ marginTop: "8px", wordBreak: "break-word", overflowWrap: "break-word" }}>{post.content}</p>}

        {isOwner && !isClosed && (
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button onClick={() => navigate(`/meal/${post.id}/edit`)} style={{ background: "#6c63ff" }}>수정</button>
            <button onClick={() => {
              if (!window.confirm("모집을 마감하시겠습니까?")) return;
              api.closeMealPost(postId, currentUser.studentId)
                .then(() => { alert("마감되었습니다."); setPost((p) => ({ ...p, status: "CLOSED" })); })
                .catch(() => alert("마감에 실패했습니다."));
            }} style={{ background: "#f59e0b" }}>조기마감</button>
            <button onClick={() => {
              if (!window.confirm("모집글을 삭제하시겠습니까? 복구할 수 없습니다.")) return;
              api.cancelMealPost(post.id)
                .then(() => { alert("삭제되었습니다."); navigate("/meal"); })
                .catch((e) => alert(e?.message || "삭제에 실패했습니다."));
            }} style={{ background: "#e24b4a" }}>삭제</button>
          </div>
        )}
        {!isOwner && !fromMyApps && (
          <>
            <button onClick={() => {
              api.applyMealPost(post.id)
                .then(() => setApplyMsg("지원이 완료되었습니다!"))
                .catch((e) => setApplyMsg(e?.message || "지원에 실패했습니다."));
            }}>지원하기</button>
            {applyMsg && <p style={{ fontSize: "13px", marginTop: "8px", color: applyMsg.includes("완료") ? "#10b981" : "#e24b4a" }}>{applyMsg}</p>}
          </>
        )}
      </div>

      {isOwner && (
        <>
          <ApplicantList applications={applications} setApplications={setApplications} onAccept={handleAccept} onReject={handleReject} isMeal={true} />
          {isClosed && (
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button onClick={() => {
                if (!window.confirm("수락된 지원자들과 채팅방을 개설하시겠습니까?")) return;
                api.confirmMealPost(post.id)
                  .then(() => { alert("채팅방이 개설되었습니다!"); navigate("/chat"); })
                  .catch((e) => alert(e?.message || "오류"));
              }} style={{ flex: 1, background: "#10b981" }}>그룹 확정</button>
              <button onClick={() => navigate("/my-posts")} style={{ flex: 1, background: "#6b7280" }}>보류</button>
              <button onClick={() => {
                if (!window.confirm("모집을 취소하면 복구할 수 없습니다.")) return;
                api.cancelMealPost(post.id)
                  .then(() => { alert("취소되었습니다."); navigate("/my-posts"); })
                  .catch((e) => alert(e?.message || "오류"));
              }} style={{ flex: 1, background: "#e24b4a" }}>모집 취소</button>
            </div>
          )}
        </>
      )}

      <button className="back" onClick={() => navigate(-1)}>뒤로가기</button>
    </div>
  );
}

// ── 팀플·공모전 수정 ──────────────────────────────────────
function TeamEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", category: "", projectName: "", content: "", maxMembers: "", deadline: "", teamFormationDate: "", preferredQualifications: "", message: "", activityMethod: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api.getPost(id)
      .then((post) => {
        const toLocal = (dt) => dt ? dt.replace("T", "T").slice(0, 16) : "";
        setForm({
          title: post.title || "",
          category: post.category || "",
          projectName: post.projectName || "",
          content: post.content || "",
          maxMembers: post.maxMembers || "",
          deadline: toLocal(post.deadline),
          teamFormationDate: toLocal(post.teamFormationDate),
          preferredQualifications: post.preferredQualifications || "",
          message: post.message || "",
          activityMethod: post.activityMethod || "",
        });
      })
      .catch(() => { alert("글을 불러오지 못했습니다."); navigate(-1); })
      .finally(() => setFetching(false));
  }, [id, navigate]);

  const handleSubmit = async () => {
    if (!form.title || !form.category || !form.projectName || !form.content || !form.maxMembers || !form.deadline || !form.activityMethod) {
      setError("필수 항목을 모두 입력해주세요."); return;
    }
    setLoading(true); setError("");
    try {
      await api.updatePost(id, { ...form, maxMembers: Number(form.maxMembers), deadline: form.deadline + ":00", teamFormationDate: form.teamFormationDate ? form.teamFormationDate + ":00" : null });
      alert("수정되었습니다!"); navigate(-1);
    } catch (e) { setError(e?.message || "수정에 실패했습니다."); }
    finally { setLoading(false); }
  };

  if (fetching) return <div className="box"><p>불러오는 중...</p></div>;

  return (
    <div className="box">
      <HamburgerMenu />
      <h2>공모전 모집글 수정</h2>
      <input type="text" placeholder="제목 *" value={form.title} onChange={set("title")} />
      <select value={form.category} onChange={set("category")} style={{ width: "100%", padding: "13px", marginBottom: "14px", border: "1px solid #ddd", borderRadius: "12px", fontSize: "15px" }}>
        <option value="">카테고리 선택 *</option>
        <option value="CONTEST">공모전</option>
        <option value="TEAM_PROJECT">팀플</option>
        <option value="PROJECT">프로젝트</option>
      </select>
      <input type="text" placeholder="프로젝트/공모전 이름 *" value={form.projectName} onChange={set("projectName")} />
      <textarea rows="4" placeholder="내용 *" value={form.content} onChange={set("content")} />
      <input type="number" placeholder="모집 인원 *" value={form.maxMembers} onChange={set("maxMembers")} />
      <label style={{ fontSize: "13px", color: "#6b7280" }}>모집 마감일 *</label>
      <input type="datetime-local" value={form.deadline} onChange={set("deadline")} />
      <label style={{ fontSize: "13px", color: "#6b7280" }}>팀 결성 희망일</label>
      <input type="datetime-local" value={form.teamFormationDate} onChange={set("teamFormationDate")} />
      <select value={form.activityMethod} onChange={set("activityMethod")} style={{ width: "100%", padding: "13px", marginBottom: "14px", border: "1px solid #ddd", borderRadius: "12px", fontSize: "15px" }}>
        <option value="">활동 방식 선택 *</option>
        <option value="ONLINE">온라인</option>
        <option value="OFFLINE">오프라인</option>
        <option value="BOTH">온/오프라인 병행</option>
      </select>
      <textarea rows="3" placeholder="우대사항 (선택)" value={form.preferredQualifications} onChange={set("preferredQualifications")} />
      <textarea rows="3" placeholder="하고 싶은 말 (선택)" value={form.message} onChange={set("message")} />
      {error && <p style={{ color: "#e24b4a", fontSize: "13px", margin: "4px 0" }}>{error}</p>}
      <button onClick={handleSubmit} disabled={loading}>{loading ? "저장 중..." : "저장"}</button>
      <button className="back" onClick={() => navigate(-1)}>취소</button>
    </div>
  );
}

// ── 밥친구 수정 ───────────────────────────────────────────
function MealEditPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", location: "", mealTime: "", maxMembers: "", content: "" });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api.getMealPost(postId)
      .then((post) => {
        setForm({
          title: post.title || "",
          location: post.location || "",
          mealTime: post.mealTime ? post.mealTime.slice(0, 16) : "",
          maxMembers: post.maxMembers || "",
          content: post.content || "",
        });
      })
      .catch(() => { alert("글을 불러오지 못했습니다."); navigate(-1); })
      .finally(() => setFetching(false));
  }, [postId, navigate]);

  const handleSubmit = async () => {
    if (!form.title || !form.location || !form.mealTime || !form.maxMembers) { alert("제목, 장소, 시간, 모집인원은 필수입니다."); return; }
    setLoading(true);
    try {
      await api.updateMealPost(postId, { ...form, maxMembers: parseInt(form.maxMembers) });
      alert("수정되었습니다!"); navigate(-1);
    } catch { alert("수정에 실패했습니다."); }
    finally { setLoading(false); }
  };

  if (fetching) return <div className="box"><p>불러오는 중...</p></div>;

  return (
    <div className="box">
      <HamburgerMenu />
      <h2>밥친구 모집글 수정</h2>
      <input type="text" placeholder="제목" value={form.title} onChange={set("title")} />
      <input type="text" placeholder="장소" value={form.location} onChange={set("location")} />
      <input type="datetime-local" value={form.mealTime} onChange={set("mealTime")} style={{ width: "100%", padding: "13px", marginBottom: "14px", border: "1px solid #ddd", borderRadius: "12px", fontSize: "15px" }} />
      <input type="number" placeholder="모집 인원 (최소 2명)" min="2" value={form.maxMembers} onChange={set("maxMembers")} />
      <textarea rows="5" placeholder="내용 (선택)" value={form.content} onChange={set("content")} style={{ width: "100%", padding: "13px", marginBottom: "14px", border: "1px solid #ddd", borderRadius: "12px", fontSize: "15px", resize: "vertical" }} />
      <button onClick={handleSubmit} disabled={loading}>{loading ? "저장 중..." : "저장"}</button>
      <button className="back" onClick={() => navigate(-1)}>취소</button>
    </div>
  );
}

// ── 내 모집글 ─────────────────────────────────────────────
function MyPostsPage() {
  const navigate = useNavigate();
  const [teamPosts, setTeamPosts] = useState([]);
  const [mealPosts, setMealPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getMyPosts().catch(() => []),
      api.getMyMealPosts().catch(() => []),
    ]).then(([team, meal]) => { setTeamPosts(team || []); setMealPosts(meal || []); }).finally(() => setLoading(false));
  }, []);

  const StatusBadge = ({ closed }) => (
    <span style={{ fontSize: "12px", fontWeight: 700, color: closed ? "#ef4444" : "#10b981", background: closed ? "#fef2f2" : "#f0fdf4", padding: "2px 8px", borderRadius: "8px", marginLeft: "8px", whiteSpace: "nowrap" }}>
      {closed ? "모집 종료" : "모집 중"}
    </span>
  );

  return (
    <div className="box wide page-box">
      <HamburgerMenu />
      <h2>내 모집글</h2>
      {loading && <p style={{ color: "#6b7280", fontSize: "14px" }}>불러오는 중...</p>}
      {!loading && teamPosts.length === 0 && mealPosts.length === 0 && (
        <p style={{ color: "#6b7280", fontSize: "14px", padding: "12px 0" }}>작성한 모집글이 없습니다.</p>
      )}

      {teamPosts.length > 0 && (
        <>
          <h3 style={{ fontSize: "14px", color: "#6b7280", margin: "12px 0 8px" }}>팀플·공모전</h3>
          <div className="simple-post-list" style={{ maxHeight: "240px", overflowY: "auto" }}>
            {teamPosts.map((post) => {
              const closed = post.statusDescription === "마감";
              return (
                <div className="simple-post" key={post.id} onClick={() => navigate(`/posts/${post.id}`)} style={{ cursor: "pointer" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                      <span className="post-tag">{post.categoryDescription}</span>
                      <span style={{ fontSize: "14px", fontWeight: 600, wordBreak: "break-word" }}>{post.title}</span>
                      <StatusBadge closed={closed} />
                    </div>
                    <p style={{ fontSize: "12px", color: "#9ca3af" }}>{post.projectName} · 마감 {post.deadline ? new Date(post.deadline).toLocaleDateString("ko-KR") : "-"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {mealPosts.length > 0 && (
        <>
          <h3 style={{ fontSize: "14px", color: "#6b7280", margin: "16px 0 8px" }}>밥친구</h3>
          <div className="simple-post-list" style={{ maxHeight: "240px", overflowY: "auto" }}>
            {mealPosts.map((post) => {
              const closed = post.status === "CLOSED";
              return (
                <div className="simple-post" key={post.id} onClick={() => navigate(`/meal/${post.id}`)} style={{ cursor: "pointer" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, wordBreak: "break-word" }}>{post.title}</span>
                      <StatusBadge closed={closed} />
                    </div>
                    <p style={{ fontSize: "12px", color: "#9ca3af" }}>{post.location} · {new Date(post.mealTime).toLocaleDateString("ko-KR")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <button className="back" onClick={() => navigate("/home")}>홈으로</button>
    </div>
  );
}

// ── 내 지원 현황 ──────────────────────────────────────────
function MyApplicationsPage() {
  const navigate = useNavigate();
  const [teamApps, setTeamApps] = useState([]);
  const [mealApps, setMealApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getMyApplications().catch(() => []),
      api.getMyMealApplications().catch(() => []),
    ]).then(([team, meal]) => { setTeamApps(team || []); setMealApps(meal || []); }).finally(() => setLoading(false));
  }, []);

  const statusStyle = (status) => {
    if (status === "ACCEPTED") return { color: "#15803d", background: "#dcfce7", border: "1px solid #bbf7d0" };
    if (status === "REJECTED") return { color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca" };
    return { color: "#9ca3af", background: "#f9fafb", border: "1px solid #e5e7eb" };
  };
  const statusLabel = (s) => s === "ACCEPTED" ? "승인" : s === "REJECTED" ? "거절" : "지원 중";

  const handleTeamClick = (app) => {
    if (app.applicationStatus === "REJECTED") {
      alert("거절되었습니다.");
      setTeamApps((prev) => prev.filter((a) => a.applicationId !== app.applicationId));
      return;
    }
    navigate(`/posts/${app.postId}`, { state: { fromMyApps: true } });
  };

  const handleMealClick = (app) => {
    if (app.applicationStatus === "REJECTED") {
      alert("거절되었습니다.");
      setMealApps((prev) => prev.filter((a) => a.applicationId !== app.applicationId));
      return;
    }
    navigate(`/meal/${app.postId}`, { state: { fromMyApps: true } });
  };

  const AppCard = ({ app, label, onClick }) => {
    const st = statusStyle(app.applicationStatus);
    return (
      <div className="simple-post" onClick={onClick} style={{ cursor: "pointer" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "14px", fontWeight: 600, wordBreak: "break-word" }}>{app.postTitle}</p>
          <p style={{ fontSize: "12px", color: "#9ca3af" }}>{label} · 작성자: {app.writerName}</p>
        </div>
        <span style={{ fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "8px", whiteSpace: "nowrap", marginLeft: "8px", ...st }}>{statusLabel(app.applicationStatus)}</span>
      </div>
    );
  };

  return (
    <div className="box wide page-box">
      <HamburgerMenu />
      <h2>내 지원 현황</h2>
      {loading && <p style={{ color: "#6b7280", fontSize: "14px" }}>불러오는 중...</p>}
      {!loading && teamApps.length === 0 && mealApps.length === 0 && (
        <p style={{ color: "#6b7280", fontSize: "14px", padding: "12px 0" }}>지원한 글이 없습니다.</p>
      )}

      {teamApps.length > 0 && (
        <>
          <h3 style={{ fontSize: "14px", color: "#6b7280", margin: "12px 0 8px" }}>팀플·공모전</h3>
          <div className="simple-post-list" style={{ maxHeight: "240px", overflowY: "auto" }}>
            {teamApps.map((app) => (
              <AppCard key={app.applicationId} app={app} label={`${app.categoryDescription} · ${app.projectName}`} onClick={() => handleTeamClick(app)} />
            ))}
          </div>
        </>
      )}

      {mealApps.length > 0 && (
        <>
          <h3 style={{ fontSize: "14px", color: "#6b7280", margin: "16px 0 8px" }}>밥친구</h3>
          <div className="simple-post-list" style={{ maxHeight: "240px", overflowY: "auto" }}>
            {mealApps.map((app) => (
              <AppCard key={app.applicationId} app={app} label={app.location} onClick={() => handleMealClick(app)} />
            ))}
          </div>
        </>
      )}

      <button className="back" onClick={() => navigate("/home")}>홈으로</button>
    </div>
  );
}

// ── 채팅방 목록 ───────────────────────────────────────────
function ChatListPage() {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyChatRooms().then(setRooms).catch(() => setRooms([])).finally(() => setLoading(false));
  }, []);

  const handleDelete = (e, roomId) => {
    e.stopPropagation();
    if (!window.confirm("채팅방을 삭제하시겠습니까? 모든 대화 내용이 사라집니다.")) return;
    api.deleteChatRoom(roomId)
      .then(() => setRooms((prev) => prev.filter((r) => r.id !== roomId)))
      .catch((err) => alert(err?.message || "삭제에 실패했습니다."));
  };

  return (
    <div className="box wide page-box">
      <HamburgerMenu />
      <h2>채팅</h2>
      {loading && <p style={{ color: "#6b7280", fontSize: "14px" }}>불러오는 중...</p>}
      {!loading && rooms.length === 0 && <p style={{ color: "#6b7280", fontSize: "14px", padding: "12px 0" }}>참여 중인 채팅방이 없습니다.</p>}
      <div className="simple-post-list">
        {rooms.map((room) => (
          <div className="simple-post" key={room.id} onClick={() => navigate(`/chat/${room.id}`)} style={{ cursor: "pointer" }}>
            <div style={{ flex: 1 }}>
              <h3>{room.name}</h3>
              <p style={{ fontSize: "13px", color: "#6b7280" }}>{room.memberNames.join(", ")}</p>
            </div>
            {room.creatorStudentId === currentUser?.studentId && (
              <button onClick={(e) => handleDelete(e, room.id)} style={{ flexShrink: 0, marginLeft: "8px", width: "52px", padding: "6px 0", background: "#e24b4a", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>삭제</button>
            )}
          </div>
        ))}
      </div>
      <button className="back" onClick={() => navigate("/home")}>홈으로</button>
    </div>
  );
}

// ── 채팅방 ────────────────────────────────────────────────
function ChatRoomPage() {
  const { currentUser } = useUser();
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);
  const bottomRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { api.getChatMessages(roomId).then(setMessages).catch(() => {}); }, [roomId]);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS("https://inhalink.onrender.com/ws"),
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/chat/${roomId}`, (frame) => {
          setMessages((prev) => [...prev, JSON.parse(frame.body)]);
        });
      },
      onDisconnect: () => setConnected(false),
    });
    client.activate();
    clientRef.current = client;
    return () => client.deactivate();
  }, [roomId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !connected) return;
    clientRef.current.publish({ destination: `/app/chat/${roomId}`, body: JSON.stringify({ senderStudentId: currentUser.studentId, content: input }) });
    setInput("");
  };

  return (
    <div className="box wide" style={{ display: "flex", flexDirection: "column", height: "80vh" }}>
      <HamburgerMenu />
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <button className="back" onClick={() => navigate("/chat")} style={{ margin: 0, width: "auto", padding: "8px 14px", flexShrink: 0 }}>←</button>
        <h2 style={{ margin: 0, flexShrink: 0 }}>채팅</h2>
        <span style={{ fontSize: "12px", color: connected ? "#10b981" : "#e24b4a", marginLeft: "auto", whiteSpace: "nowrap", flexShrink: 0 }}>{connected ? "● 연결됨" : "● 연결 중..."}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
        {messages.map((msg, i) => {
          const isMine = msg.senderStudentId === currentUser.studentId;
          return (
            <div key={msg.id || i} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
              {!isMine && <span style={{ fontSize: "12px", color: "#6b7280", marginBottom: "2px" }}>{msg.senderName}</span>}
              <div style={{ maxWidth: "70%", padding: "8px 12px", borderRadius: "12px", background: isMine ? "#6c63ff" : "#f3f4f6", color: isMine ? "#fff" : "#111", fontSize: "14px", wordBreak: "break-word" }}>{msg.content}</div>
              <span style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>{msg.sentAt ? new Date(msg.sentAt + "Z").toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        <input style={{ flex: 1, minWidth: 0, padding: "10px 14px", borderRadius: "12px", border: "1px solid #ddd", fontSize: "14px" }} placeholder="메시지를 입력하세요" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); sendMessage(); } }} />
        <button onClick={sendMessage} disabled={!connected} style={{ flexShrink: 0, width: "44px", height: "44px", borderRadius: "50%", background: "#6c63ff", color: "#fff", border: "none", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>➤</button>
      </div>
    </div>
  );
}

export default App;
