"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

const MENU_ITEMS = [
  { key: "profile", label: "프로필 관리" },
  { key: "notifications", label: "알림 설정" },
  { key: "security", label: "계정 / 보안" },
  { key: "settlement", label: "정산관리" },
];

const INITIAL_PROFILE = {
  name: "",
  phone: "",
  email: "",
  shopName: "",
  profileImageUrl: "",
  intro: "",
};

const INITIAL_NOTIFICATION = {
  chatPush: false,
  rentStatusPush: false,
  communityPush: false,
  marketingOptIn: false,
};

const INITIAL_SETTLEMENT_ACCOUNT = {
  payoutAccountId: null,
  bankName: "",
  accountNumberMasked: "",
  accountHolder: "",
  verified: false,
  createdAt: "",
};

const INITIAL_SETTLEMENT_SUMMARY = {
  scheduledAmount: 0,
  nextPayoutDate: "",
  depositAmount: 0,
  activeRentalCount: 0,
  recentPayoutAmount: 0,
  recentDays: 30,
};

const BANK_OPTIONS = [
  "국민은행",
  "신한은행",
  "우리은행",
  "하나은행",
  "농협은행",
  "카카오뱅크",
  "토스뱅크",
  "기업은행",
  "새마을금고",
  "우체국",
];

function getAccessToken() {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken") ||
    ""
  );
}

async function request(url, options = {}) {
  const token = getAccessToken();
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  let data = null;
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      (typeof data === "object" && data?.message) ||
      (typeof data === "string" && data) ||
      `요청 실패 (${response.status})`;
    throw new Error(message);
  }

  return data;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateText(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function SettingsPage() {
  const [activeMenu, setActiveMenu] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [profileForm, setProfileForm] = useState({
    intro: "",
  });
  const [profilePreview, setProfilePreview] = useState("");
  const [profileFile, setProfileFile] = useState(null);

  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATION);

  const [settlementAccount, setSettlementAccount] = useState(
    INITIAL_SETTLEMENT_ACCOUNT
  );
  const [settlementSummary, setSettlementSummary] = useState(
    INITIAL_SETTLEMENT_SUMMARY
  );
  const [verifyForm, setVerifyForm] = useState({
    bankName: BANK_OPTIONS[0],
    accountNumber: "",
    accountHolder: "",
  });
  const [verifyState, setVerifyState] = useState({
    verificationId: "",
    maskedAccount: "",
  });
  const [confirmCode, setConfirmCode] = useState("");

  const fileInputRef = useRef(null);

  const userDisplayName = useMemo(() => {
    return profile.shopName || profile.name || "빌려잇 사용자";
  }, [profile]);

  useEffect(() => {
    void loadSettingsData();
  }, []);

  async function loadSettingsData() {
    setLoading(true);
    setError("");

    try {
      const [profileRes, notificationRes, settlementAccountRes, settlementSummaryRes] =
        await Promise.allSettled([
          request("/bilyeoit/v1/profile/me"),
          request("/bilyeoit/v1/notification-settings"),
          request("/bilyeoit/v1/settlement/account"),
          request("/bilyeoit/v1/settlement/summary"),
        ]);

      if (profileRes.status === "fulfilled" && profileRes.value) {
        const nextProfile = {
          ...INITIAL_PROFILE,
          ...profileRes.value,
        };
        setProfile(nextProfile);
        setProfileForm({ intro: nextProfile.intro || "" });
        setProfilePreview(nextProfile.profileImageUrl || "");
      }

      if (notificationRes.status === "fulfilled" && notificationRes.value) {
        setNotifications({
          ...INITIAL_NOTIFICATION,
          ...notificationRes.value,
        });
      }

      if (
        settlementAccountRes.status === "fulfilled" &&
        settlementAccountRes.value
      ) {
        setSettlementAccount({
          ...INITIAL_SETTLEMENT_ACCOUNT,
          ...settlementAccountRes.value,
        });
      } else {
        setSettlementAccount(INITIAL_SETTLEMENT_ACCOUNT);
      }

      if (
        settlementSummaryRes.status === "fulfilled" &&
        settlementSummaryRes.value
      ) {
        setSettlementSummary({
          ...INITIAL_SETTLEMENT_SUMMARY,
          ...settlementSummaryRes.value,
        });
      }
    } catch (err) {
      setError(err.message || "설정 정보를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  function handleProfileFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setProfileFile(file);
    const previewUrl = URL.createObjectURL(file);
    setProfilePreview(previewUrl);
  }

  async function handleSaveProfile() {
    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const formData = new FormData();
      if (profileFile) formData.append("profileImg", profileFile);
      formData.append("intro", profileForm.intro || "");

      await request("/bilyeoit/v1/updateuser", {
        method: "PUT",
        body: formData,
      });

      await loadSettingsData();
      setSuccessMessage("프로필이 저장되었어요.");
    } catch (err) {
      setError(err.message || "프로필 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleNotification(key) {
    const nextValue = !notifications[key];
    const previousValue = notifications[key];

    setNotifications((prev) => ({ ...prev, [key]: nextValue }));
    setError("");
    setSuccessMessage("");

    try {
      const query = new URLSearchParams({ [key]: String(nextValue) }).toString();
      await request(`/bilyeoit/v1/notification-settings?${query}`, {
        method: "PATCH",
      });
      setSuccessMessage("알림 설정이 변경되었어요.");
    } catch (err) {
      setNotifications((prev) => ({ ...prev, [key]: previousValue }));
      setError(err.message || "알림 설정 변경에 실패했어요.");
    }
  }

  async function handleRequestVerification() {
    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const result = await request("/bilyeoit/v1/settlement/account/verify", {
        method: "POST",
        body: JSON.stringify(verifyForm),
      });

      setVerifyState({
        verificationId: result?.verificationId || "",
        maskedAccount: result?.maskedAccount || "",
      });
      setSuccessMessage(result?.message || "1원 인증 요청이 전송되었어요.");
    } catch (err) {
      setError(err.message || "계좌 인증 요청에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmVerification() {
    if (!verifyState.verificationId) {
      setError("먼저 계좌 인증 요청을 진행해주세요.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = {
        verificationId: verifyState.verificationId,
        verificationCode: confirmCode,
        bankName: verifyForm.bankName,
        accountNumber: verifyForm.accountNumber,
        accountHolder: verifyForm.accountHolder,
      };

      const result = await request(
        "/bilyeoit/v1/settlement/account/verify/confirm",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      setSuccessMessage(result?.message || "계좌 인증이 완료되었어요.");
      setConfirmCode("");
      setVerifyState({ verificationId: "", maskedAccount: "" });
      await loadSettingsData();
    } catch (err) {
      setError(err.message || "계좌 인증 확인에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSettlementAccount() {
    if (!window.confirm("등록된 정산 계좌를 삭제할까요?")) return;

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      await request("/bilyeoit/v1/settlement/account", {
        method: "DELETE",
      });
      setSuccessMessage("정산 계좌가 삭제되었어요.");
      await loadSettingsData();
    } catch (err) {
      setError(err.message || "정산 계좌 삭제에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.topTitle}>
          <h1>설정</h1>
          <p>개인정보 관리, 알림, 보안, 정산 정보를 한 곳에서 관리할 수 있어요.</p>
        </div>

        {(error || successMessage) && (
          <div
            className={`${styles.message} ${
              error ? styles.errorMessage : styles.successMessage
            }`}
          >
            {error || successMessage}
          </div>
        )}

        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarProfile}>
              <div className={styles.sidebarThumb}>
                {profilePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profilePreview} alt={userDisplayName} />
                ) : (
                  <span>{userDisplayName.slice(0, 1)}</span>
                )}
              </div>

              <div className={styles.sidebarMeta}>
                <strong>{userDisplayName}</strong>
                <p>{profile.email || "이메일 정보 없음"}</p>
              </div>
            </div>

            <div className={styles.menuList}>
              {MENU_ITEMS.map((item) => {
                const isActive = activeMenu === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`${styles.menuButton} ${isActive ? styles.menuButtonActive : ""}`}
                    onClick={() => {
                      setActiveMenu(item.key);
                      setError("");
                      setSuccessMessage("");
                    }}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={styles.content}>
            {loading ? (
              <div className={styles.panel}>
                <div className={styles.loadingBox}>불러오는 중...</div>
              </div>
            ) : (
              <>
                {activeMenu === "profile" && (
                  <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <h2>내 정보</h2>
                        <p>프로필 이미지와 소개글을 수정할 수 있어요.</p>
                      </div>
                    </div>

                    <div className={styles.profileLayout}>
                      <div className={styles.profileImageArea}>
                        <div className={styles.profileImagePreview}>
                          {profilePreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={profilePreview} alt={userDisplayName} />
                          ) : (
                            <span>{userDisplayName.slice(0, 1)}</span>
                          )}
                        </div>

                        <div className={styles.profileImageButtons}>
                          <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            사진 변경
                          </button>
                          <button
                            type="button"
                            className={styles.subtleButton}
                            onClick={() => {
                              setProfileFile(null);
                              setProfilePreview(profile.profileImageUrl || "");
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                          >
                            취소
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={handleProfileFileChange}
                          />
                        </div>
                      </div>

                      <div className={styles.profileInfoArea}>
                        <div className={styles.fieldGridTwo}>
                          <StaticField label="이름" value={profile.name || "-"} />
                          <StaticField label="상점명" value={profile.shopName || "-"} />
                          <StaticField label="휴대폰 번호" value={profile.phone || "-"} />
                          <StaticField label="이메일" value={profile.email || "-"} />
                        </div>

                        <div className={styles.fieldBlock}>
                          <label>소개글</label>
                          <textarea
                            value={profileForm.intro}
                            onChange={(event) =>
                              setProfileForm((prev) => ({
                                ...prev,
                                intro: event.target.value,
                              }))
                            }
                            maxLength={100}
                            placeholder="자신을 소개하는 문장을 입력해주세요."
                          />
                          <div className={styles.fieldCount}>{profileForm.intro.length}/100</div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.actionRow}>
                      <button
                        type="button"
                        className={styles.ghostButton}
                        onClick={() => {
                          setProfileForm({ intro: profile.intro || "" });
                          setProfileFile(null);
                          setProfilePreview(profile.profileImageUrl || "");
                        }}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={handleSaveProfile}
                        disabled={saving}
                      >
                        {saving ? "저장 중..." : "변경사항 저장"}
                      </button>
                    </div>
                  </div>
                )}

                {activeMenu === "notifications" && (
                  <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <h2>알림 설정</h2>
                        <p>원하는 알림만 켜고 받을 수 있어요.</p>
                      </div>
                    </div>

                    <div className={styles.notificationGroup}>
                      <div className={styles.notificationGroupHead}>알림 설정</div>

                      <NotificationRow
                        title="채팅 알림"
                        desc="새 메시지가 오면 푸시로 알려드려요."
                        checked={notifications.chatPush}
                        onToggle={() => handleToggleNotification("chatPush")}
                      />
                      <NotificationRow
                        title="대여상태 알림"
                        desc="대여 요청, 승인, 반납 상태가 바뀌면 안내해요."
                        checked={notifications.rentStatusPush}
                        onToggle={() => handleToggleNotification("rentStatusPush")}
                      />
                      <NotificationRow
                        title="커뮤니티 알림"
                        desc="댓글, 답글, 인기글 관련 소식을 받아볼 수 있어요."
                        checked={notifications.communityPush}
                        onToggle={() => handleToggleNotification("communityPush")}
                      />
                      <NotificationRow
                        title="마케팅 수신 동의"
                        desc="이벤트, 쿠폰, 프로모션 정보를 받아볼 수 있어요."
                        checked={notifications.marketingOptIn}
                        onToggle={() => handleToggleNotification("marketingOptIn")}
                      />
                    </div>
                  </div>
                )}

                {activeMenu === "security" && (
                  <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <h2>계정 / 보안</h2>
                        <p>현재 API 명세에는 비밀번호 변경 엔드포인트가 없어 UI만 먼저 연결해뒀어요.</p>
                      </div>
                    </div>

                    <div className={styles.securitySection}>
                      <div className={styles.sectionTitle}>계정 정보</div>
                      <div className={styles.fieldGridTwo}>
                        <StaticField label="이름" value={profile.name || "-"} />
                        <StaticField label="이메일" value={profile.email || "-"} />
                        <StaticField label="휴대폰 번호" value={profile.phone || "-"} />
                        <StaticField label="상점명" value={profile.shopName || "-"} />
                      </div>
                    </div>

                    <div className={styles.securitySection}>
                      <div className={styles.sectionTitle}>비밀번호 변경</div>
                      <div className={styles.fieldGridTwo}>
                        <InputField label="현재 비밀번호" type="password" placeholder="현재 비밀번호 입력" />
                        <InputField label="새 비밀번호" type="password" placeholder="새 비밀번호 입력" />
                        <div className={styles.fieldSpanTwo}>
                          <InputField
                            label="새 비밀번호 확인"
                            type="password"
                            placeholder="새 비밀번호를 다시 입력"
                          />
                        </div>
                      </div>
                      <div className={styles.inlineActionRow}>
                        <button type="button" className={styles.primaryButton} disabled>
                          API 준비중
                        </button>
                      </div>
                    </div>

                    <div className={`${styles.securitySection} ${styles.helpSection}`}>
                      <div className={styles.sectionTitle}>보안 안내</div>
                      <ul>
                        <li>로그인 토큰은 localStorage 또는 sessionStorage 기준으로 읽어와요.</li>
                        <li>비밀번호 변경 API가 추가되면 바로 연결할 수 있게 구조를 나눠뒀어요.</li>
                        <li>필요하면 회원 탈퇴, 소셜 연동 해제 UI도 이어서 붙일 수 있어요.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {activeMenu === "settlement" && (
                  <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <h2>정산 / 출금</h2>
                        <p>정산 계좌 등록, 1원 인증, 정산 요약을 확인할 수 있어요.</p>
                      </div>
                    </div>

                    <div className={styles.settlementGrid}>
                      <div className={styles.settlementBox}>
                        <div className={styles.sectionTitle}>정산 계좌</div>

                        {settlementAccount?.payoutAccountId ? (
                          <div className={styles.registeredAccountCard}>
                            <div>
                              <strong>
                                {settlementAccount.bankName} {settlementAccount.accountNumberMasked}
                              </strong>
                              <p>{settlementAccount.accountHolder}</p>
                            </div>
                            <div className={styles.registeredMeta}>
                              <span
                                className={`${styles.verifyBadge} ${
                                  settlementAccount.verified ? styles.verifyBadgeActive : ""
                                }`}
                              >
                                {settlementAccount.verified ? "인증완료" : "미인증"}
                              </span>
                              <small>{formatDateText(settlementAccount.createdAt)}</small>
                            </div>
                            <button
                              type="button"
                              className={styles.deleteTextButton}
                              onClick={handleDeleteSettlementAccount}
                              disabled={saving}
                            >
                              계좌 삭제
                            </button>
                          </div>
                        ) : (
                          <div className={styles.accountFormGrid}>
                            <SelectField
                              label="은행"
                              value={verifyForm.bankName}
                              options={BANK_OPTIONS}
                              onChange={(value) =>
                                setVerifyForm((prev) => ({ ...prev, bankName: value }))
                              }
                            />
                            <InputField
                              label="계좌번호"
                              value={verifyForm.accountNumber}
                              onChange={(event) =>
                                setVerifyForm((prev) => ({
                                  ...prev,
                                  accountNumber: event.target.value,
                                }))
                              }
                              placeholder="- 없이 입력"
                            />
                            <InputField
                              label="예금주"
                              value={verifyForm.accountHolder}
                              onChange={(event) =>
                                setVerifyForm((prev) => ({
                                  ...prev,
                                  accountHolder: event.target.value,
                                }))
                              }
                              placeholder="예금주명 입력"
                            />

                            <div className={styles.fieldSpanThree}>
                              <div className={styles.verifyRequestRow}>
                                <button
                                  type="button"
                                  className={styles.primaryButton}
                                  onClick={handleRequestVerification}
                                  disabled={saving}
                                >
                                  1원 인증 요청
                                </button>
                                {verifyState.maskedAccount && (
                                  <p className={styles.verifyGuideText}>
                                    입금계좌: {verifyState.maskedAccount}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className={styles.fieldSpanThree}>
                              <div className={styles.verifyConfirmBox}>
                                <InputField
                                  label="입금자명 뒤 3자리"
                                  value={confirmCode}
                                  onChange={(event) => setConfirmCode(event.target.value)}
                                  placeholder="예: 123"
                                />
                                <button
                                  type="button"
                                  className={styles.primaryButton}
                                  onClick={handleConfirmVerification}
                                  disabled={saving}
                                >
                                  인증 확인
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={styles.settlementBox}>
                        <div className={styles.sectionTitle}>정산 요약</div>
                        <div className={styles.summaryGrid}>
                          <SummaryCard
                            title="정산 예정 금액"
                            value={formatCurrency(settlementSummary.scheduledAmount)}
                            active
                          />
                          <SummaryCard
                            title="보증금 합계"
                            value={formatCurrency(settlementSummary.depositAmount)}
                          />
                          <SummaryCard
                            title="최근 정산 금액"
                            value={formatCurrency(settlementSummary.recentPayoutAmount)}
                          />
                        </div>

                        <div className={styles.summaryMetaList}>
                          <SummaryMeta
                            label="다음 정산일"
                            value={formatDateText(settlementSummary.nextPayoutDate)}
                          />
                          <SummaryMeta
                            label="진행 중 대여"
                            value={`${settlementSummary.activeRentalCount || 0}건`}
                          />
                          <SummaryMeta
                            label="최근 정산 기준"
                            value={`${settlementSummary.recentDays || 30}일`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className={styles.actionRow}>
                      <button
                        type="button"
                        className={styles.ghostButton}
                        onClick={loadSettingsData}
                      >
                        새로고침
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StaticField({ label, value }) {
  return (
    <div className={styles.fieldBlock}>
      <label>{label}</label>
      <div className={styles.staticValue}>{value}</div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className={styles.fieldBlock}>
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className={styles.fieldBlock}>
      <label>{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function NotificationRow({ title, desc, checked, onToggle }) {
  return (
    <div className={styles.notificationRow}>
      <div className={styles.notificationText}>
        <strong>{title}</strong>
        <p>{desc}</p>
      </div>
      <button
        type="button"
        className={`${styles.toggleSwitch} ${checked ? styles.toggleSwitchOn : ""}`}
        onClick={onToggle}
        aria-pressed={checked}
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  );
}

function SummaryCard({ title, value, active = false }) {
  return (
    <div className={`${styles.summaryCard} ${active ? styles.summaryCardActive : ""}`}>
      <p>{title}</p>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryMeta({ label, value }) {
  return (
    <div className={styles.summaryMetaItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
