const BASE = "https://inhalink.onrender.com/api";

function getToken() { return localStorage.getItem("token"); }
export function saveToken(token) { localStorage.setItem("token", token); }
export function clearToken() { localStorage.removeItem("token"); }

async function request(method, path, body) {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json;
  try { json = await res.json(); } catch { throw new Error("서버 응답을 처리할 수 없습니다."); }
  if (!res.ok) throw json;
  return json.data;
}

export const api = {
  // 회원가입 / 로그인
  signup: (body) => request("POST", "/users/signup", body),
  login: (studentId, password) => request("POST", "/users/login", { studentId, password }),
  getMe: () => request("GET", "/users/me"),

  // 프로필
  getProfile: (studentId) => request("GET", `/users/${studentId}/profile`),
  createProfile: (studentId, body) => request("POST", `/users/${studentId}/profile`, body),
  updateProfile: (studentId, body) => request("PUT", `/users/${studentId}/profile`, body),

  // 팀플·공모전 모집글
  getPosts: () => request("GET", "/posts"),
  getPost: (postId) => request("GET", `/posts/${postId}`),
  createPost: (studentId, body) => request("POST", `/posts?studentId=${studentId}`, body),
  updatePost: (postId, body) => request("PUT", `/posts/${postId}`, body),
  getMyPosts: () => request("GET", "/posts/my"),
  closePost: (postId, studentId) => request("PATCH", `/posts/${postId}/close?studentId=${studentId}`),
  confirmPost: (postId) => request("POST", `/posts/${postId}/confirm`),
  cancelPost: (postId) => request("DELETE", `/posts/${postId}`),

  // 팀플·공모전 지원
  applyPost: (postId) => request("POST", `/posts/${postId}/apply`),
  getApplications: (postId) => request("GET", `/posts/${postId}/applications`),
  acceptApplication: (appId) => request("PATCH", `/applications/${appId}/accept`),
  rejectApplication: (appId) => request("PATCH", `/applications/${appId}/reject`),
  getMyApplications: () => request("GET", "/applications/my"),

  // 밥친구 모집글
  getMealPosts: () => request("GET", "/meal-posts"),
  getMealPost: (postId) => request("GET", `/meal-posts/${postId}`),
  createMealPost: (studentId, body) => request("POST", `/meal-posts?studentId=${studentId}`, body),
  updateMealPost: (postId, body) => request("PUT", `/meal-posts/${postId}`, body),
  getMyMealPosts: () => request("GET", "/meal-posts/my"),
  closeMealPost: (postId, studentId) => request("PATCH", `/meal-posts/${postId}/close?studentId=${studentId}`),
  confirmMealPost: (postId) => request("POST", `/meal-posts/${postId}/confirm`),
  cancelMealPost: (postId) => request("DELETE", `/meal-posts/${postId}`),

  // 밥친구 지원
  applyMealPost: (postId) => request("POST", `/meal-posts/${postId}/apply`),
  getMealApplications: (postId) => request("GET", `/meal-posts/${postId}/applications`),
  acceptMealApplication: (appId) => request("PATCH", `/meal-applications/${appId}/accept`),
  rejectMealApplication: (appId) => request("PATCH", `/meal-applications/${appId}/reject`),
  getMyMealApplications: () => request("GET", "/meal-applications/my"),

  // 채팅
  getMyChatRooms: () => request("GET", "/chat/rooms"),
  getChatMessages: (roomId) => request("GET", `/chat/rooms/${roomId}/messages`),
  deleteChatRoom: (roomId) => request("DELETE", `/chat/rooms/${roomId}`),

  // 즉시 매칭
  joinMatching: (studentId) => request("POST", `/matching?studentId=${studentId}`),
  getMatchingStatus: (studentId) => request("GET", `/matching?studentId=${studentId}`),
  cancelMatching: (studentId) => fetch(`${BASE}/matching?studentId=${studentId}`, { method: "DELETE" }),
};
