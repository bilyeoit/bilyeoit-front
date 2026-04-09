"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import {
  analyzeProductImages,
  createProduct,
  deleteUploadedImages,
  getCategories,
  getSubcategories,
} from "@/services/productCreate";

const MAX_IMAGES = 5;
const DRAFT_KEY = "bilyeoit-product-create-draft-v1";

function parseTags(input) {
  return input
    .split(/[#,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function buildPreviewList(files) {
  return files.map((file) => ({
    file,
    url: URL.createObjectURL(file),
    name: file.name,
  }));
}

function getAiDepositValue(result) {
  return (
    result?.recommendedDeposit ??
    result?.depositAmount ??
    result?.rentalPrice?.recommendedDeposit ??
    result?.rentalPrice?.deposit ??
    null
  );
}

/**
 * 100원 단위 반올림
 * 예)
 * 1,787 -> 1,800
 * 19,436 -> 19,400
 */
function roundToHundreds(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.round(num / 100) * 100;
}

/**
 * 보증금:
 * AI 추천값 / 5
 * 이후 1000원 단위 반올림
 * 예)
 * 21,000 -> /5 = 4,200 -> 4,000
 * 27,600 -> /5 = 5,520 -> 6,000
 */
function normalizeDeposit(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;

  const divided = num / 5;
  return Math.round(divided / 1000) * 1000;
}

export default function ProductCreatePage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const [form, setForm] = useState({
    title: "",
    firstCategoryId: "",
    secondCategoryId: "",
    description: "",
    tagsInput: "",
    pricePerDay: "",
    depositAmount: "",
    rentalDays: "3",
    pickupArea: "",
  });

  const [ai, setAi] = useState({
    imageUrl: "",
    s3Keys: [],
    productNames: [],
    category: null,
    descriptionDraft: "",
    tags: [],
    rentalPrice: null,
    rawDeposit: null,
  });

  const [selectedAiTitle, setSelectedAiTitle] = useState("");
  const [selectedAiCategory, setSelectedAiCategory] = useState({
    firstCategory: "",
    secondCategory: "",
  });
  const [selectedAiTags, setSelectedAiTags] = useState([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedFirstCategory = useMemo(
    () =>
      categories.find(
        (item) => String(item.categoryId) === String(form.firstCategoryId)
      ) || null,
    [categories, form.firstCategoryId]
  );

  const selectedSecondCategory = useMemo(
    () =>
      subcategories.find(
        (item) => String(item.categoryId) === String(form.secondCategoryId)
      ) || null,
    [subcategories, form.secondCategoryId]
  );

  useEffect(() => {
    let ignore = false;

    async function fetchInitialCategories() {
      try {
        setLoadingCategories(true);
        const data = await getCategories();
        if (ignore) return;

        const firstCategories = Array.isArray(data)
          ? data.filter((item) => item.categoryType === "FIRST")
          : [];

        setCategories(firstCategories);
      } catch (err) {
        console.error(err);
        setError("카테고리를 불러오지 못했어요.");
      } finally {
        if (!ignore) setLoadingCategories(false);
      }
    }

    fetchInitialCategories();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      setForm((prev) => ({
        ...prev,
        ...parsed,
      }));
    } catch (err) {
      console.error("임시저장 불러오기 실패", err);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function fetchSubs() {
      if (!form.firstCategoryId) {
        setSubcategories([]);
        setForm((prev) => ({ ...prev, secondCategoryId: "" }));
        return;
      }

      try {
        setSubLoading(true);
        const data = await getSubcategories(form.firstCategoryId);
        if (ignore) return;
        setSubcategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        if (!ignore) setSubcategories([]);
      } finally {
        if (!ignore) setSubLoading(false);
      }
    }

    fetchSubs();

    return () => {
      ignore = true;
    };
  }, [form.firstCategoryId]);

  useEffect(() => {
  if (!pendingAiSecondCategory) return;
  if (!Array.isArray(subcategories) || subcategories.length === 0) return;

  const matchedSecond = subcategories.find(
    (item) => item.name.trim() === pendingAiSecondCategory.trim()
  );

  if (matchedSecond) {
    setForm((prev) => ({
      ...prev,
      secondCategoryId: String(matchedSecond.categoryId),
    }));
    setMessage("AI 추천 카테고리가 적용됐어요.");
    setError("");
  } else {
    setError("대분류는 적용했지만 일치하는 중분류를 찾지 못했어요.");
    setMessage("");
  }

  setPendingAiSecondCategory("");
}, [pendingAiSecondCategory, subcategories]);

  useEffect(() => {
    return () => {
      previews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [previews]);

  const handleChange = (key) => (e) => {
    setForm((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
  };

  const handleOpenPicker = () => {
    fileInputRef.current?.click();
  };

  const handleSelectAiTitle = (title) => {
    setSelectedAiTitle(title);
  };

  const handleSelectAiCategory = () => {
    setSelectedAiCategory({
      firstCategory: ai?.category?.firstCategory || "",
      secondCategory: ai?.category?.secondCategory || "",
    });
  };

  const handleToggleAiTag = (tag) => {
    setSelectedAiTags((prev) => {
      const exists = prev.includes(tag);

      if (exists) {
        return prev.filter((item) => item !== tag);
      }

      if (prev.length >= 5) {
        return prev;
      }

      return [...prev, tag];
    });
  };

  const handleFileChange = async (e) => {
    const nextFiles = Array.from(e.target.files || []).slice(0, MAX_IMAGES);

    if (nextFiles.length === 0) return;

    const validTypes = ["image/jpeg", "image/png"];
    const hasInvalid = nextFiles.some((file) => !validTypes.includes(file.type));

    if (hasInvalid) {
      setError("JPG 또는 PNG 파일만 업로드 가능합니다.");
      setMessage("");
      return;
    }

    previews.forEach((item) => URL.revokeObjectURL(item.url));
    const nextPreviews = buildPreviewList(nextFiles);

    setFiles(nextFiles);
    setPreviews(nextPreviews);
    setMessage("");
    setError("");

    try {
      setAnalyzing(true);

      const result = await analyzeProductImages(nextFiles);

      const roundedDailyRental = roundToHundreds(
        result?.rentalPrice?.dailyRental ?? null
      );

      const rawDeposit = getAiDepositValue(result);

      setAi({
        imageUrl: result?.imageUrl || "",
        s3Keys: Array.isArray(result?.s3Keys) ? result.s3Keys : [],
        productNames: Array.isArray(result?.productNames)
          ? result.productNames
          : [],
        category: result?.category || null,
        descriptionDraft: result?.descriptionDraft || "",
        tags: Array.isArray(result?.tags) ? result.tags : [],
        rentalPrice: result?.rentalPrice
          ? {
              ...result.rentalPrice,
              dailyRental:
                roundedDailyRental ?? result?.rentalPrice?.dailyRental ?? null,
            }
          : null,
        rawDeposit,
      });

      setSelectedAiTitle(
        Array.isArray(result?.productNames) && result.productNames.length > 0
          ? result.productNames[0]
          : ""
      );

      setSelectedAiCategory({
        firstCategory: result?.category?.firstCategory || "",
        secondCategory: result?.category?.secondCategory || "",
      });

      setSelectedAiTags(
        Array.isArray(result?.tags) ? result.tags.slice(0, 5) : []
      );

      setMessage("이미지 분석이 완료됐어요. 추천값을 선택해서 적용해보세요.");
    } catch (err) {
      console.error(err);
      setError(err.message || "이미지 분석에 실패했어요.");
    } finally {
      setAnalyzing(false);
    }
  };

  const applyAiTitle = () => {
    if (!selectedAiTitle) return;
    setForm((prev) => ({
      ...prev,
      title: selectedAiTitle,
    }));
  };

  const applyAiCategory = () => {
  const aiFirst = (selectedAiCategory.firstCategory || "").trim();
  const aiSecond = (selectedAiCategory.secondCategory || "").trim();

  if (!aiFirst) {
    setError("AI 추천 대분류가 없어요.");
    setMessage("");
    return;
  }

  const first = categories.find(
    (item) => item.name.trim() === aiFirst
  );

  if (!first) {
    setError("AI 추천 대분류를 현재 카테고리 목록에서 찾지 못했어요.");
    setMessage("");
    return;
  }

  setPendingAiSecondCategory(aiSecond);

  setForm((prev) => ({
    ...prev,
    firstCategoryId: String(first.categoryId),
    secondCategoryId: "",
  }));

  setError("");
  setMessage("카테고리 적용 중이에요.");
};

  const applyAiDescription = () => {
    if (!ai.descriptionDraft) return;
    setForm((prev) => ({
      ...prev,
      description: ai.descriptionDraft,
    }));
  };

  const applyAiTags = () => {
    if (!selectedAiTags.length) return;
    setForm((prev) => ({
      ...prev,
      tagsInput: selectedAiTags.map((tag) => `#${tag}`).join(" "),
    }));
  };

  const applyAiPrice = () => {
    if (!ai.rentalPrice?.dailyRental) return;
    setForm((prev) => ({
      ...prev,
      pricePerDay: String(roundToHundreds(ai.rentalPrice.dailyRental)),
    }));
  };

  const applyAiDeposit = () => {
    if (!ai.rawDeposit) return;
    setForm((prev) => ({
      ...prev,
      depositAmount: String(normalizeDeposit(ai.rawDeposit)),
    }));
  };

  const applyAllAi = () => {
    applyAiTitle();
    applyAiCategory();
    applyAiDescription();
    applyAiTags();
    applyAiPrice();
    applyAiDeposit();
  };

  const handleSaveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    setMessage("임시저장이 완료됐어요.");
    setError("");
  };

  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setMessage("임시저장을 삭제했어요.");
    setError("");
  };

  const validateForm = () => {
    if (!form.title.trim()) return "상품명을 입력해주세요.";
    if (!form.firstCategoryId) return "카테고리를 선택해주세요.";
    if (!form.secondCategoryId) return "중분류 카테고리를 선택해주세요.";
    if (!form.description.trim()) return "설명을 입력해주세요.";
    if (!form.pricePerDay || Number(form.pricePerDay) <= 0)
      return "대여가를 입력해주세요.";
    if (!form.depositAmount || Number(form.depositAmount) < 0)
      return "보증금을 입력해주세요.";
    if (!form.rentalDays || Number(form.rentalDays) <= 0)
      return "대여 가능 기간을 입력해주세요.";
    if (!ai.imageUrl) return "이미지를 업로드하고 AI 분석을 먼저 진행해주세요.";
    return "";
  };

  const handleSubmit = async () => {
    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      setMessage("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        pricePerDay: roundToHundreds(Number(form.pricePerDay)),
        depositAmount: Number(form.depositAmount),
        firstCategory: selectedFirstCategory?.name || "",
        secondCategory: selectedSecondCategory?.name || "",
        tags: parseTags(form.tagsInput),
        imageUrl: ai.imageUrl,
        rentalDays: Number(form.rentalDays),
      };

      await createProduct(payload);

      localStorage.removeItem(DRAFT_KEY);
      setMessage("상품이 등록됐어요. 상품목록으로 이동합니다.");

      setTimeout(() => {
        router.push("/product");
      }, 700);
    } catch (err) {
      console.error(err);
      setError(err.message || "상품 등록에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveImages = async () => {
    try {
      if (ai.s3Keys?.length) {
        await deleteUploadedImages(ai.s3Keys);
      }
    } catch (err) {
      console.error("업로드 이미지 삭제 실패", err);
    } finally {
      previews.forEach((item) => URL.revokeObjectURL(item.url));
      setFiles([]);
      setPreviews([]);
      setAi({
        imageUrl: "",
        s3Keys: [],
        productNames: [],
        category: null,
        descriptionDraft: "",
        tags: [],
        rentalPrice: null,
        rawDeposit: null,
      });
      setSelectedAiTitle("");
      setSelectedAiCategory({
        firstCategory: "",
        secondCategory: "",
      });
      setSelectedAiTags([]);
      setMessage("이미지를 비웠어요.");
      setError("");
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <section className={styles.pageHead}>
          <div>
            <h1 className={styles.pageTitle}>상품 등록</h1>
            <p className={styles.pageDesc}>
              이미지 업로드 후 AI가 카테고리·상품명·설명·태그·가격을 추천하고,
              사용자가 원하는 값으로 수정할 수 있어요.
            </p>
          </div>
        </section>

        <div className={styles.layout}>
          <section className={styles.leftCol}>
            <div className={styles.sectionTitleBox}>
              <h2>상품 이미지</h2>
              <p>대표 이미지 1장 + 추가 4장, 최대 5장</p>
            </div>

            <div className={styles.imageUploader}>
              <button
                type="button"
                className={styles.imageDrop}
                onClick={handleOpenPicker}
              >
                {previews.length > 0 ? (
                  <img
                    src={previews[0].url}
                    alt="대표 이미지"
                    className={styles.mainPreview}
                  />
                ) : (
                  <div className={styles.imagePlaceholder}>
                    <div className={styles.cameraIcon}>📷</div>
                    <span>이미지를 드래그하거나 클릭해서 업로드</span>
                  </div>
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                multiple
                hidden
                onChange={handleFileChange}
              />

              <div className={styles.thumbRow}>
                {Array.from({ length: MAX_IMAGES }).map((_, index) => {
                  const preview = previews[index];

                  return (
                    <div key={index} className={styles.thumbSlot}>
                      {preview ? (
                        <img
                          src={preview.url}
                          alt={preview.name}
                          className={styles.thumbImage}
                        />
                      ) : (
                        <span className={styles.thumbEmpty}>📷</span>
                      )}
                    </div>
                  );
                })}

                <div className={styles.thumbMeta}>
                  {previews.length}/{MAX_IMAGES}
                </div>

                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={handleOpenPicker}
                >
                  이미지 변경
                </button>
              </div>

              {previews.length > 0 ? (
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={handleRemoveImages}
                >
                  업로드 이미지 비우기
                </button>
              ) : null}
            </div>

            <div className={styles.aiPanel}>
              <div className={styles.aiPanelHead}>
                <strong>AI 추천</strong>
                <span>
                  이미지 + 입력된 정보로 상품명/카테고리/설명/태그/가격을 자동
                  제안해요
                </span>
              </div>

              <div className={styles.aiCard}>
                <div className={styles.aiCardHead}>
                  <h3>상품명</h3>
                  <button
                    type="button"
                    className={styles.applyMiniBtn}
                    onClick={applyAiTitle}
                    disabled={!selectedAiTitle}
                  >
                    적용
                  </button>
                </div>

                <div className={styles.suggestionList}>
                  {ai.productNames?.length ? (
                    ai.productNames.slice(0, 3).map((name, index) => (
                      <button
                        type="button"
                        key={`${name}-${index}`}
                        className={`${styles.choiceCard} ${
                          selectedAiTitle === name
                            ? styles.choiceCardActive
                            : ""
                        }`}
                        onClick={() => handleSelectAiTitle(name)}
                      >
                        <span>{name}</span>
                        {selectedAiTitle === name ? (
                          <span className={styles.choiceBadge}>추천</span>
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <p className={styles.emptyText}>
                      이미지 분석 후 추천값이 보여요.
                    </p>
                  )}
                </div>
              </div>

              <div className={styles.aiCard}>
                <div className={styles.aiCardHead}>
                  <h3>카테고리 추천</h3>
                  <button
                    type="button"
                    className={styles.applyMiniBtn}
                    onClick={applyAiCategory}
                    disabled={!selectedAiCategory.firstCategory}
                  >
                    적용
                  </button>
                </div>

                {ai.category ? (
                  <button
                    type="button"
                    className={`${styles.choiceCard} ${
                      selectedAiCategory.firstCategory
                        ? styles.choiceCardActive
                        : ""
                    }`}
                    onClick={handleSelectAiCategory}
                  >
                    <div className={styles.categoryChoiceBox}>
                      <div className={styles.categoryChoiceMain}>
                        {ai.category.firstCategory}
                      </div>
                      <div className={styles.categoryChoiceSub}>
                        {ai.category.secondCategory || "-"}
                      </div>
                    </div>
                  </button>
                ) : (
                  <p className={styles.emptyText}>
                    추천 카테고리가 아직 없어요.
                  </p>
                )}
              </div>

              <div className={styles.aiCard}>
                <div className={styles.aiCardHead}>
                  <h3>설명 초안 추천</h3>
                  <button
                    type="button"
                    className={styles.applyMiniBtn}
                    onClick={applyAiDescription}
                    disabled={!ai.descriptionDraft}
                  >
                    적용
                  </button>
                </div>

                <div className={styles.longSuggestion}>
                  {ai.descriptionDraft ||
                    "이미지 분석 후 설명 초안이 생성돼요."}
                </div>
              </div>

              <div className={styles.aiCard}>
                <div className={styles.aiCardHead}>
                  <h3>태그 추천</h3>
                  <button
                    type="button"
                    className={styles.applyMiniBtn}
                    onClick={applyAiTags}
                    disabled={!selectedAiTags.length}
                  >
                    적용
                  </button>
                </div>

                <div className={styles.tagRow}>
                  {ai.tags?.length ? (
                    ai.tags.map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        className={`${styles.tagChip} ${
                          selectedAiTags.includes(tag)
                            ? styles.tagChipActive
                            : ""
                        }`}
                        onClick={() => handleToggleAiTag(tag)}
                      >
                        #{tag}
                      </button>
                    ))
                  ) : (
                    <p className={styles.emptyText}>
                      추천 태그가 아직 없어요.
                    </p>
                  )}
                </div>

                {ai.tags?.length ? (
                  <p className={styles.helperText}>
                    최대 5개까지 선택 가능 ({selectedAiTags.length}/5)
                  </p>
                ) : null}
              </div>

              <div className={styles.aiCard}>
                <div className={styles.aiCardHead}>
                  <h3>추천 대여 시세</h3>
                  <button
                    type="button"
                    className={styles.applyMiniBtn}
                    onClick={applyAiPrice}
                    disabled={!ai.rentalPrice?.dailyRental}
                  >
                    적용
                  </button>
                </div>

                {ai.rentalPrice ? (
                  <div className={styles.priceHintBox}>
                    <strong>
                      ₩
                      {Number(
                        roundToHundreds(ai.rentalPrice.dailyRental) || 0
                      ).toLocaleString()}{" "}
                      / 하루
                    </strong>
                  </div>
                ) : (
                  <p className={styles.emptyText}>
                    이미지 분석 후 대여가 추천이 보여요.
                  </p>
                )}
              </div>

              <div className={styles.aiCard}>
                <div className={styles.aiCardHead}>
                  <h3>추천 보증금 시세</h3>
                  <button
                    type="button"
                    className={styles.applyMiniBtn}
                    onClick={applyAiDeposit}
                    disabled={!ai.rawDeposit}
                  >
                    적용
                  </button>
                </div>

                {ai.rawDeposit ? (
                  <div className={styles.priceHintBox}>
                    <strong>
                      ₩
                      {Number(
                        normalizeDeposit(ai.rawDeposit) || 0
                      ).toLocaleString()}
                    </strong>
                  </div>
                ) : (
                  <p className={styles.emptyText}>
                    이미지 분석 후 보증금 추천이 보여요.
                  </p>
                )}
              </div>

              <div className={styles.aiBottomBtns}>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={applyAllAi}
                >
                  전체 적용
                </button>
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={handleRemoveImages}
                >
                  다시 추천받기
                </button>
              </div>
            </div>
          </section>

          <section className={styles.rightCol}>
            <div className={styles.sectionTitleBox}>
              <h2>상품 정보</h2>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formRow}>
                <label>상품명</label>
                <div className={styles.inlineField}>
                  <input
                    className={styles.input}
                    value={form.title}
                    onChange={handleChange("title")}
                    placeholder="캠핑 버너(세척용) + 전용 케이스 포함"
                    maxLength={40}
                  />
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={applyAiTitle}
                    disabled={!selectedAiTitle}
                  >
                    AI 추천 적용
                  </button>
                </div>
                <div className={styles.helperRow}>
                  <span>실제 빌려줄 구성품을 포함해서 적어주세요.</span>
                  <span>{form.title.length}/40</span>
                </div>
              </div>

              <div className={styles.formRow}>
                <label>카테고리</label>
                <div className={styles.categoryInline}>
                  <select
                    className={styles.select}
                    value={form.firstCategoryId}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        firstCategoryId: e.target.value,
                        secondCategoryId: "",
                      }))
                    }
                    disabled={loadingCategories}
                  >
                    <option value="">대분류 선택</option>
                    {categories.map((item) => (
                      <option key={item.categoryId} value={item.categoryId}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className={styles.select}
                    value={form.secondCategoryId}
                    onChange={handleChange("secondCategoryId")}
                    disabled={!form.firstCategoryId || subLoading}
                  >
                    <option value="">중분류 선택</option>
                    {subcategories.map((item) => (
                      <option key={item.categoryId} value={item.categoryId}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={applyAiCategory}
                    disabled={!selectedAiCategory.firstCategory}
                  >
                    AI 추천 적용
                  </button>
                </div>
                <p className={styles.helperText}>
                  추천이 틀리면 드롭다운에서 직접 바꾸거나, 먼저 카테고리를 선택할 수
                  있어요.
                </p>
              </div>

              <div className={styles.formRow}>
                <label>설명</label>
                <textarea
                  className={styles.textarea}
                  value={form.description}
                  onChange={handleChange("description")}
                  placeholder="상태(기스/사용감), 구성품, 픽업 가능 시간, 주의사항 등을 적어주세요."
                  maxLength={2000}
                />
                <div className={styles.actionRow}>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={applyAiDescription}
                    disabled={!ai.descriptionDraft}
                  >
                    AI 추천 적용
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        description: "",
                      }))
                    }
                  >
                    다시 쓰기
                  </button>
                </div>
                <div className={styles.helperRow}>
                  <span>자세할수록 거래 성사율이 높아져요.</span>
                  <span>{form.description.length}/2000</span>
                </div>
              </div>

              <div className={styles.formRow}>
                <label>태그 (선택)</label>
                <div className={styles.inlineField}>
                  <input
                    className={styles.input}
                    value={form.tagsInput}
                    onChange={handleChange("tagsInput")}
                    placeholder="#캠핑 #버너 #조리도구 #불멍 #차박"
                  />
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={applyAiTags}
                    disabled={!selectedAiTags.length}
                  >
                    AI 추천 적용
                  </button>
                </div>
                <p className={styles.helperText}>
                  최대 5개까지 권장. 해시태그 없이 적어도 자동 분리돼요.
                </p>
              </div>

              <div className={styles.formRow}>
                <label>가격 (하루)</label>
                <div className={styles.inlineField}>
                  <input
                    className={styles.input}
                    type="number"
                    value={form.pricePerDay}
                    onChange={handleChange("pricePerDay")}
                    placeholder="8000"
                  />
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={applyAiPrice}
                    disabled={!ai.rentalPrice?.dailyRental}
                  >
                    AI 추천 적용
                  </button>
                </div>

                {ai.rentalPrice?.dailyRental ? (
                  <div className={styles.inlineHintBox}>
                    평균시세 ₩
                    {Number(
                      roundToHundreds(ai.rentalPrice.dailyRental) || 0
                    ).toLocaleString()}
                    {ai.rentalPrice.priceBandLabel
                      ? ` · ${ai.rentalPrice.priceBandLabel}`
                      : ""}
                  </div>
                ) : null}
              </div>

              <div className={styles.formRow}>
                <label>보증금</label>
                <div className={styles.inlineField}>
                  <input
                    className={styles.input}
                    type="number"
                    value={form.depositAmount}
                    onChange={handleChange("depositAmount")}
                    placeholder="20000"
                  />
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={applyAiDeposit}
                    disabled={!ai.rawDeposit}
                  >
                    AI 추천 적용
                  </button>
                </div>
              </div>

              <div className={styles.formRow}>
                <label>대여 가능 기간</label>
                <div className={styles.inlineField}>
                  <input
                    className={styles.input}
                    type="number"
                    min="1"
                    value={form.rentalDays}
                    onChange={handleChange("rentalDays")}
                    placeholder="예: 3"
                  />
                  <div className={styles.inlineHintBox}>
                    예: 1일 / 3일 / 최대 7일
                  </div>
                </div>
              </div>

            </div>

            {(message || error) && (
              <div
                className={`${styles.noticeBox} ${error ? styles.errorBox : ""}`}
              >
                {error || message}
              </div>
            )}

            <div className={styles.submitBar}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleSaveDraft}
              >
                임시저장
              </button>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={handleClearDraft}
              >
                임시저장 삭제
              </button>
              <button
                type="button"
                className={styles.primarySubmitBtn}
                onClick={handleSubmit}
                disabled={submitting || analyzing}
              >
                {submitting ? "등록 중..." : analyzing ? "분석 중..." : "등록하기"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}