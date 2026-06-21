import "./App.css";
import { useState, useEffect, useRef, createContext, useContext } from "react";
import { api, saveToken, clearToken } from "./api";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";

function formatPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

// ── 전역 사용자 상태 Context ──────────────────────────────
const UserContext = createContext(null);
function useUser() { return useContext(UserContext); }

// ── 로그인 필요 라우트 가드 ───────────────────────────────
function RequireAuth({ children }) {
  const { currentUser } = useUser();
  if (!currentUser) return <Navigate to="/" replace />;
  return children;
}

// ── 앱 루트 ──────────────────────────────────────────────
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [verified, setVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);

  // 새로고침 시 토큰으로 로그인 상태 복원
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || currentUser) return;
    api.getMe().then((profile) => {
      setCurrentUser({ studentId: profile.studentId, name: profile.name, gender: profile.gender || "MALE", contact: formatPhone(profile.contact || "") });
    }).catch(() => clearToken());
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPosts = async () => {
    try {
      const data = await api.getPosts();
      setPosts(data || []);
    } catch {
      setPosts([]);
    }
  };

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, posts, setPosts, selectedPost, setSelectedPost, loadPosts, verified, setVerified, verifiedEmail, setVerifiedEmail }}>
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
              <Route path="/posts/:id" element={<RequireAuth><TeamDetailPage /></RequireAuth>} />
              <Route path="/meal" element={<RequireAuth><MealPage /></RequireAuth>} />
              <Route path="/meal/write" element={<RequireAuth><MealWritePage /></RequireAuth>} />
              <Route path="/meal/:postId" element={<RequireAuth><MealDetailPage /></RequireAuth>} />
              <Route path="/my-posts" element={<RequireAuth><MyPostsPage /></RequireAuth>} />
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
      <p className="start-text">
        밥친구부터 공모전 팀원까지<br />
        인하대 학생들을 연결해주는 플랫폼
      </p>
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
    if (!studentId.trim() || !password.trim()) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.login(studentId, password);
      saveToken(data.token);
      const profile = data.profile;
      setCurrentUser({ studentId: profile.studentId, name: profile.name, gender: profile.gender || "MALE", contact: formatPhone(profile.contact || "") });
      if (!profile.profileComplete) {
        navigate("/profile/create");
      } else {
        navigate("/home");
      }
    } catch {
      setError("학번 또는 비밀번호가 올바르지 않습니다.");
    } finally {
      setLoading(false);
    }
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [signupStudentId, setSignupStudentId] = useState("");
  const [gender, setGender] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !signupStudentId.trim() || !password.trim() || !name.trim() || !gender || !contact.trim()) {
      setError("모든 필수 항목을 입력해주세요.");
      return;
    }
    if (!email.endsWith("@inha.ac.kr") && !email.endsWith("@inha.edu")) {
      setError("인하대학교 이메일(@inha.ac.kr 또는 @inha.edu)만 사용 가능합니다.");
      return;
    }
    setLoading(true); setError("");
    try {
      await api.signup({ email, password, name, studentId: signupStudentId, gender, contact });
      alert("회원가입이 완료되었습니다!");
      navigate("/login");
    } catch (e) {
      const msgs = Object.values(e || {}).join(" / ");
      setError(msgs || "회원가입에 실패했습니다.");
    } finally { setLoading(false); }
  };

  return (
    <div className="box">
      <h2>회원가입</h2>
      <input type="text" placeholder="이메일 (@inha.ac.kr 또는 @inha.edu)" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="text" placeholder="학번" value={signupStudentId} onChange={(e) => setSignupStudentId(e.target.value)} />
      <input type="password" placeholder="비밀번호 (8자 이상)" value={password} onChange={(e) => setPassword(e.target.value)} />
      <input type="text" placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} />
      <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ width: "100%", padding: "13px", marginBottom: "14px", border: "1px solid #ddd", borderRadius: "12px", fontSize: "15px" }}>
        <option value="">성별 선택</option>
        <option value="MALE">남성</option>
        <option value="FEMALE">여성</option>
      </select>
      <input type="text" placeholder="연락처 (010-xxxx-xxxx)" value={contact} onChange={(e) => setContact(formatPhone(e.target.value))} />
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
  const [form, setForm] = useState({
    name: currentUser?.name || "",
    gender: currentUser?.gender || "MALE",
    contact: formatPhone(currentUser?.contact || ""),
    department: "", domains: "", activities: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    const { name, contact, department, domains } = form;
    if (!name.trim() || !contact.trim() || !department.trim() || !domains.trim()) {
      setError("이름, 연락처, 학과, 관심분야는 필수 입력 사항입니다.");
      return;
    }
    setLoading(true); setError("");
    try {
      const updated = await api.createProfile(currentUser.studentId, form);
      setCurrentUser({ ...currentUser, name: updated.name });
      navigate("/posts");
    } catch (e) {
      const msgs = Object.values(e || {}).join(" / ");
      setError(msgs || "프로필 작성에 실패했습니다.");
    } finally { setLoading(false); }
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
      <textarea rows="4" placeholder="대외활동 이력 (선택)" value={form.activities} onChange={set("activities")} />
      {error && <p style={{ color: "#e24b4a", fontSize: "13px", margin: "4px 0" }}>{error}</p>}
      <button onClick={handleSubmit} disabled={loading}>{loading ? "저장 중..." : "프로필 작성 완료"}</button>
    </div>
  );
}

// ── 마이페이지 프로필 수정 ────────────────────────────────
function ProfileEditBox() {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", gender: "", contact: "", department: "", domains: "", activities: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getProfile(currentUser.studentId).then((p) => {
      setForm({
        name: p.name || "",
        gender: p.gender || "",
        contact: formatPhone(p.contact || ""),
        department: p.department || "",
        domains: p.domains || "",
        activities: p.activities || "",
      });
    }).catch(() => {});
  }, [currentUser.studentId]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      await api.updateProfile(currentUser.studentId, form);
      alert("프로필이 수정되었습니다.");
      navigate("/home");
    } catch (e) {
      const msgs = Object.values(e || {}).join(" / ");
      setError(msgs || "프로필 수정에 실패했습니다.");
    } finally { setLoading(false); }
  };

  return (
    <div className="box">
      <h2>프로필 수정</h2>
      <input type="text" placeholder="이름" value={form.name} onChange={set("name")} />
      <select value={form.gender} onChange={set("gender")} style={{ width: "100%", padding: "13px", marginBottom: "14px", border: "1px solid #ddd", borderRadius: "12px", fontSize: "15px" }}>
        <option value="MALE">남성</option>
        <option value="FEMALE">여성</option>
      </select>
      <input type="text" placeholder="연락처" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: formatPhone(e.target.value) }))} />
      <input type="text" placeholder="학과" value={form.department} onChange={set("department")} />
      <input type="text" placeholder="관심 분야" value={form.domains} onChange={set("domains")} />
      <textarea rows="4" placeholder="대외활동 이력" value={form.activities} onChange={set("activities")} />
      {error && <p style={{ color: "#e24b4a", fontSize: "13px", margin: "4px 0" }}>{error}</p>}
      <button onClick={handleSubmit} disabled={loading}>{loading ? "저장 중..." : "수정 완료"}</button>
      <button className="back" onClick={() => navigate("/home")}>취소</button>
    </div>
  );
}

// ── 홈 (서비스 선택) ──────────────────────────────────────
function HomePage() {
  const { loadPosts, setCurrentUser } = useUser();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = () => {
    clearToken();
    setCurrentUser(null);
    navigate("/");
  };

  return (
    <>
      <div className="main-top">
        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      {menuOpen && (
        <>
          <div
            className="menu-bg"
            onClick={() => setMenuOpen(false)}
          ></div>

          <div className="side-menu">
            <h2 className="side-menu-title">InhaLink</h2>

            <p onClick={() => navigate("/home")}>
              🏠 홈
            </p>

            <p onClick={() => navigate("/profile/edit")}>
              👤 프로필 수정
            </p>

            <p onClick={() => { setMenuOpen(false); navigate("/my-posts"); }}>
              📋 내 모집글
            </p>

            <p onClick={logout}>
              🚪 로그아웃
            </p>
          </div>
        </>
      )}

      <div className="service-wrap">
        <div
          className="service-card"
          onClick={() => navigate("/meal")}
        >
          <div className="icon green">👥</div>
          <h2>밥친구 찾기</h2>
          <p>같이 식사할 친구를 찾아보세요</p>
        </div>

        <div
          className="service-card"
          onClick={() => {
            loadPosts();
            navigate("/posts");
          }}
        >
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
  const { posts, setSelectedPost, loadPosts } = useUser();
  const navigate = useNavigate();

  useEffect(() => { loadPosts(); }, [loadPosts]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="box wide page-box">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ margin: 0 }}>팀플·공모전 메인</h2>
        <button className="small-btn" onClick={() => navigate("/posts/write")} style={{ width: "auto", padding: "8px 16px" }}>모집글 작성</button>
      </div>
      <input type="text" placeholder="검색어를 입력하세요" />
      <div className="simple-post-list">
        {posts.length === 0 && (
          <p style={{ color: "#6b7280", fontSize: "14px", padding: "12px 0" }}>등록된 모집글이 없습니다.</p>
        )}
        {posts.map((post) => (
          <div
            className="simple-post"
            key={post.id}
            onClick={() => { setSelectedPost(post); navigate(`/posts/${post.id}`); }}
            style={{ cursor: "pointer" }}
          >
            <div>
              <h3>{post.title}</h3>
              <p>{post.categoryDescription} · {post.projectName} · {post.maxMembers}명 모집</p>
            </div>
            <button className="small-btn" onClick={(e) => { e.stopPropagation(); setSelectedPost(post); navigate(`/posts/${post.id}`); }}>
              {post.statusDescription}
            </button>
          </div>
        ))}
      </div>
      <div className="btn-row">
        <button onClick={() => navigate("/posts/status")}>현황</button>
      </div>
      <button className="back" onClick={() => navigate("/home")}>서비스 선택으로</button>
    </div>
  );
}

// ── 팀플·공모전 모집글 작성 ───────────────────────────────
function TeamWritePage() {
  const { currentUser, loadPosts } = useUser();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", category: "", projectName: "", content: "",
    maxMembers: "", deadline: "", teamFormationDate: "",
    preferredQualifications: "", message: "", activityMethod: "",
  });
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
      await api.createPost(currentUser.studentId, {
        ...form,
        maxMembers: Number(form.maxMembers),
        deadline: form.deadline + ":00",
        teamFormationDate: form.teamFormationDate ? form.teamFormationDate + ":00" : null,
      });
      alert("모집글이 등록되었습니다!");
      await loadPosts();
      navigate("/posts");
    } catch (e) {
      if (typeof e === "object" && !e.message) {
        setFieldErrors(e);
        setError("입력 정보를 확인해주세요.");
      } else {
        setError(e?.message || "모집글 등록에 실패했습니다.");
      }
    } finally { setLoading(false); }
  };

  const fe = (k) => fieldErrors[k] ? <p style={{ color: "#e24b4a", fontSize: "12px", margin: "-10px 0 8px" }}>{fieldErrors[k]}</p> : null;

  return (
    <div className="box">
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
  const { selectedPost, currentUser } = useUser();
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(selectedPost || null);
  const [loading, setLoading] = useState(!selectedPost);

  const [applications, setApplications] = useState([]);
  const [applyMsg, setApplyMsg] = useState("");
  const isOwner = post && currentUser?.studentId === post.writerStudentId;


  useEffect(() => {
    if (!selectedPost && id) {
      api.getPost(id)
        .then(setPost)
        .catch(() => navigate("/posts"))
        .finally(() => setLoading(false));
    }
  }, [id, selectedPost, navigate]);


  useEffect(() => {
    if (isOwner && post) {
      api.getApplications(post.id).then(setApplications).catch(() => {});
    }
  }, [isOwner, post]);

  const handleApply = () => {
    api.applyPost(post.id)
      .then(() => setApplyMsg("지원이 완료되었습니다!"))
      .catch((e) => setApplyMsg(e?.message || "지원에 실패했습니다."));
  };

  const handleAccept = (appId) => {
    api.acceptApplication(appId).then(() => {
      setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: "ACCEPTED" } : a));
    }).catch((e) => alert(e?.message || "오류가 발생했습니다."));
  };

  const handleReject = (appId) => {
    api.rejectApplication(appId).then(() => {
      setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: "REJECTED" } : a));
    }).catch((e) => alert(e?.message || "오류가 발생했습니다."));
  };

  if (loading) return <div className="box wide"><p style={{ color: "#6b7280" }}>불러오는 중...</p></div>;
  if (!post) return null;

  return (
    <div className="box wide">
      <h2>공모전 모집글 상세</h2>
      <div className="post">
        <h3>{post.title}</h3>
        <p>카테고리: {post.categoryDescription}</p>
        <p>프로젝트명: {post.projectName}</p>
        <p>작성자: {post.writerName}</p>
        <p>모집 인원: {post.maxMembers}명</p>
        <p>활동 방식: {post.activityMethodDescription}</p>
        <p>마감일: {new Date(post.deadline).toLocaleDateString("ko-KR")}</p>
        {post.preferredQualifications && <p>우대사항: {post.preferredQualifications}</p>}
        <p style={{ marginTop: "12px" }}>{post.content}</p>
        {post.message && <p style={{ color: "#6b7280" }}>{post.message}</p>}


        {isOwner && post.statusDescription !== "마감" && (
          <button onClick={() => {
            if (!window.confirm("모집을 마감하시겠습니까?")) return;
            api.closePost(post.id, currentUser.studentId)
              .then(() => { alert("마감되었습니다."); setPost((p) => ({ ...p, statusDescription: "마감" })); })
              .catch(() => alert("마감에 실패했습니다."));
          }} style={{ marginTop: "8px", background: "#e24b4a" }}>조기마감</button>
        )}
        {!isOwner && (
          <>
            <button onClick={handleApply}>지원하기</button>
            {applyMsg && <p style={{ fontSize: "13px", marginTop: "8px", color: applyMsg.includes("완료") ? "#10b981" : "#e24b4a" }}>{applyMsg}</p>}
          </>
        )}
      </div>

      {isOwner && (
        <div style={{ marginTop: "24px" }}>
          <h3 style={{ fontSize: "15px", marginBottom: "12px" }}>지원자 목록</h3>
          {applications.length === 0 && <p style={{ color: "#6b7280", fontSize: "14px" }}>아직 지원자가 없습니다.</p>}
          {applications.map((app) => (
            <div key={app.id} style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontWeight: "600", fontSize: "14px" }}>{app.applicantName} ({app.applicantStudentId})</p>
                  <p style={{ fontSize: "12px", color: "#6b7280" }}>{app.applicantDepartment}</p>
                  {app.applicantDomains && <p style={{ fontSize: "12px", color: "#6b7280" }}>관심분야: {app.applicantDomains}</p>}
                  {app.applicantActivities && <p style={{ fontSize: "12px", color: "#6b7280" }}>활동이력: {app.applicantActivities}</p>}
                  {app.applicantContact && <p style={{ fontSize: "12px", color: "#6b7280" }}>연락처: {app.applicantContact}</p>}
                </div>
                {app.status === "PENDING" ? (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => handleAccept(app.id)} style={{ padding: "6px 14px", background: "#10b981", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>수락</button>
                    <button onClick={() => handleReject(app.id)} style={{ padding: "6px 14px", background: "#e24b4a", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>거절</button>
                  </div>
                ) : (
                  <span style={{ fontSize: "13px", color: app.status === "ACCEPTED" ? "#10b981" : "#e24b4a" }}>
                    {app.status === "ACCEPTED" ? "수락됨" : "거절됨"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="back" onClick={() => navigate(-1)}>뒤로가기</button>
    </div>
  );
}

// ── 밥친구 ────────────────────────────────────────────────
function MealPage() {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMealPosts().then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="box wide page-box">
      <h2>밥친구 메인</h2>
      {loading && <p style={{ color: "#6b7280", fontSize: "14px" }}>불러오는 중...</p>}
      <div className="simple-post-list">
        {posts.map((post) => (
          <div className="simple-post" key={post.id}>
            <div>
              <h3>{post.title}</h3>
              <p>{post.location} · {new Date(post.mealTime).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} · 최대 {post.maxMembers}명</p>
            </div>
            <button className="small-btn" onClick={() => navigate(`/meal/${post.id}`)}>{post.status === "RECRUITING" ? "모집중" : "마감"}</button>
          </div>
        ))}
        {!loading && posts.length === 0 && <p style={{ color: "#6b7280", fontSize: "14px", padding: "12px 0" }}>등록된 밥친구 모집글이 없습니다.</p>}
      </div>
      <div className="btn-row">
        <button onClick={() => navigate("/meal/write")}>작성</button>
      </div>
      <button className="back" onClick={() => navigate("/home")}>서비스 선택으로</button>
    </div>
  );
}

function MealWritePage() {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [mealTime, setMealTime] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !location.trim() || !mealTime || !maxMembers) {
      alert("제목, 장소, 시간, 모집인원은 필수입니다."); return;
    }
    setLoading(true);
    try {
      await api.createMealPost(currentUser.studentId, { title, location, mealTime, maxMembers: parseInt(maxMembers), content });
      alert("밥친구 모집글이 등록되었습니다!");
      navigate("/meal");
    } catch { alert("등록에 실패했습니다."); }
    finally { setLoading(false); }
  };

  return (
    <div className="box">
      <h2>밥친구 모집글 작성</h2>
      <input type="text" placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input type="text" placeholder="장소" value={location} onChange={(e) => setLocation(e.target.value)} />
      <input type="datetime-local" value={mealTime} onChange={(e) => setMealTime(e.target.value)} style={{ width: "100%", padding: "13px", marginBottom: "14px", border: "1px solid #ddd", borderRadius: "12px", fontSize: "15px" }} />
      <input type="number" placeholder="모집 인원 (최소 2명)" min="2" value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} />
      <textarea rows="5" placeholder="내용" value={content} onChange={(e) => setContent(e.target.value)} style={{ width: "100%", padding: "13px", marginBottom: "14px", border: "1px solid #ddd", borderRadius: "12px", fontSize: "15px", resize: "vertical" }} />
      <button onClick={handleSubmit} disabled={loading}>{loading ? "처리 중..." : "등록"}</button>
      <button className="back" onClick={() => navigate("/meal")}>취소</button>
    </div>
  );
}

function MealDetailPage() {
  const { postId } = useParams();
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);

  useEffect(() => {
    api.getMealPost(postId).then(setPost).catch(() => navigate("/meal"));
  }, [postId, navigate]);

  const handleClose = async () => {
    if (!window.confirm("모집을 마감하시겠습니까?")) return;
    try {
      await api.closeMealPost(postId, currentUser.studentId);
      alert("마감되었습니다.");
      setPost((p) => ({ ...p, status: "CLOSED" }));
    } catch { alert("마감에 실패했습니다."); }
  };

  if (!post) return <div className="box"><p>불러오는 중...</p></div>;

  const isWriter = currentUser?.studentId === post.writerStudentId;

  return (
    <div className="box wide">
      <h2>밥친구 모집글 상세</h2>
      <div className="post">
        <h3>{post.title}</h3>
        <p>장소: {post.location}</p>
        <p>시간: {new Date(post.mealTime).toLocaleString("ko-KR")}</p>
        <p>최대 인원: {post.maxMembers}명</p>
        <p>작성자: {post.writerName}</p>
        <p>상태: {post.status === "RECRUITING" ? "모집중" : "마감"}</p>
        {post.content && <p style={{ marginTop: "8px" }}>{post.content}</p>}
        {isWriter && post.status === "RECRUITING" && (
          <button onClick={handleClose} style={{ marginTop: "8px", background: "#e24b4a" }}>조기마감</button>
        )}
      </div>
      <button className="back" onClick={() => navigate("/meal")}>뒤로가기</button>
    </div>
  );
}

// ── 내 모집글 ─────────────────────────────────────────────
function MyPostsPage() {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPosts()
      .then((all) => setPosts(all.filter((p) => p.writerStudentId === currentUser.studentId)))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [currentUser.studentId]);

  return (
    <div className="box wide page-box">
      <h2>내 모집글</h2>
      {loading && <p style={{ color: "#6b7280", fontSize: "14px" }}>불러오는 중...</p>}
      {!loading && posts.length === 0 && (
        <p style={{ color: "#6b7280", fontSize: "14px", padding: "12px 0" }}>작성한 모집글이 없습니다.</p>
      )}
      <div className="simple-post-list">
        {posts.map((post) => (
          <div className="simple-post" key={post.id} onClick={() => navigate(`/posts/${post.id}`)} style={{ cursor: "pointer" }}>
            <div>
              <span className="post-tag">{post.categoryDescription}</span>
              <h3>{post.title}</h3>
              <p>{post.projectName} · {post.statusDescription}</p>
              <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                마감 {post.deadline ? new Date(post.deadline).toLocaleDateString("ko-KR") : "-"}
              </p>
            </div>
          </div>
        ))}
      </div>
      <button className="back" onClick={() => navigate("/home")}>홈으로</button>
    </div>
  );
}

// ── 채팅방 목록 ───────────────────────────────────────────
function ChatListPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyChatRooms()
      .then(setRooms)
      .catch(() => setRooms([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="box wide page-box">
      <h2>채팅</h2>
      {loading && <p style={{ color: "#6b7280", fontSize: "14px" }}>불러오는 중...</p>}
      {!loading && rooms.length === 0 && (
        <p style={{ color: "#6b7280", fontSize: "14px", padding: "12px 0" }}>참여 중인 채팅방이 없습니다.</p>
      )}
      <div className="simple-post-list">
        {rooms.map((room) => (
          <div className="simple-post" key={room.id} onClick={() => navigate(`/chat/${room.id}`)} style={{ cursor: "pointer" }}>
            <div>
              <h3>{room.name}</h3>
              <p>{room.memberNames.join(", ")}</p>
            </div>
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

  // 이전 메시지 로드
  useEffect(() => {
    api.getChatMessages(roomId).then(setMessages).catch(() => {});
  }, [roomId]);

  // WebSocket 연결
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/chat/${roomId}`, (frame) => {
          const msg = JSON.parse(frame.body);
          setMessages((prev) => [...prev, msg]);
        });
      },
      onDisconnect: () => setConnected(false),
    });
    client.activate();
    clientRef.current = client;
    return () => client.deactivate();
  }, [roomId]);

  // 새 메시지 올 때 스크롤 하단 이동
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !connected) return;
    clientRef.current.publish({
      destination: `/app/chat/${roomId}`,
      body: JSON.stringify({ senderStudentId: currentUser.studentId, content: input }),
    });
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="box wide" style={{ display: "flex", flexDirection: "column", height: "80vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <button className="back" onClick={() => navigate("/chat")} style={{ margin: 0 }}>←</button>
        <h2 style={{ margin: 0 }}>채팅</h2>
        <span style={{ fontSize: "12px", color: connected ? "#10b981" : "#e24b4a", marginLeft: "auto" }}>
          {connected ? "● 연결됨" : "● 연결 중..."}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
        {messages.map((msg, i) => {
          const isMine = msg.senderStudentId === currentUser.studentId;
          return (
            <div key={msg.id || i} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
              {!isMine && <span style={{ fontSize: "12px", color: "#6b7280", marginBottom: "2px" }}>{msg.senderName}</span>}
              <div style={{
                maxWidth: "70%", padding: "8px 12px", borderRadius: "12px",
                background: isMine ? "#6c63ff" : "#f3f4f6",
                color: isMine ? "#fff" : "#111",
                fontSize: "14px",
              }}>
                {msg.content}
              </div>
              <span style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
                {msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : ""}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        <input
          style={{ flex: 1, padding: "10px 14px", borderRadius: "12px", border: "1px solid #ddd", fontSize: "14px" }}
          placeholder="메시지를 입력하세요"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={sendMessage} disabled={!connected} style={{ padding: "10px 18px", borderRadius: "12px", background: "#6c63ff", color: "#fff", border: "none", cursor: "pointer", fontSize: "14px" }}>
          전송
        </button>
      </div>
    </div>
  );
}

export default App;
