(() => {
  "use strict";

  window.JYMLog =
    window.JYMLog || {};

  const catalog =
    window.JYMLog
      .exerciseCatalog;

  const templateIdInput =
    document.getElementById(
      "exerciseTemplateIdInput"
    );

  const sourceInput =
    document.getElementById(
      "exerciseSourceInput"
    );

  const searchInput =
    document.getElementById(
      "exerciseCatalogSearchInput"
    );

  const bodyPartFilter =
    document.getElementById(
      "exerciseCatalogBodyPartFilter"
    );

  const equipmentFilter =
    document.getElementById(
      "exerciseCatalogEquipmentFilter"
    );

  const resultsElement =
    document.getElementById(
      "exerciseCatalogResults"
    );

  const resultMessage =
    document.getElementById(
      "exerciseCatalogResultMessage"
    );

  const selectedSummary =
    document.getElementById(
      "exerciseTemplateSummary"
    );

  const customButton =
    document.getElementById(
      "useCustomExerciseBtn"
    );

  const nameInput =
    document.getElementById(
      "exerciseNameInput"
    );

  const equipmentInput =
    document.getElementById(
      "exerciseEquipmentInput"
    );

  const primaryBodyPartInput =
    document.getElementById(
      "exercisePrimaryBodyPartInput"
    );

  const suggestionElement =
    document.getElementById(
      "exerciseTemplateSuggestion"
    );

  const suggestionTitle =
    document.getElementById(
      "exerciseTemplateSuggestionTitle"
    );

  const suggestionDescription =
    document.getElementById(
      "exerciseTemplateSuggestionDescription"
    );

  const acceptSuggestionButton =
    document.getElementById(
      "acceptExerciseTemplateSuggestionBtn"
    );

  const dismissSuggestionButton =
    document.getElementById(
      "dismissExerciseTemplateSuggestionBtn"
    );

  let initialized = false;

  let suggestedTemplateId = "";

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll(
        "'",
        "&#039;"
      );
  }

  function populateSelect(
    select,
    items,
    firstOption
  ) {
    if (!select) {
      return;
    }

    select.innerHTML = [
      firstOption
        ? `
          <option
            value="${escapeHtml(
              firstOption.value
            )}"
          >
            ${escapeHtml(
              firstOption.label
            )}
          </option>
        `
        : "",

      ...items.map(
        (item) => `
          <option
            value="${escapeHtml(
              item.id
            )}"
          >
            ${escapeHtml(
              item.label
            )}
          </option>
        `
      )
    ].join("");
  }

  function populateControls() {
    if (!catalog) {
      return;
    }

    populateSelect(
      bodyPartFilter,
      catalog.bodyParts,
      {
        value: "all",
        label: "전체 부위"
      }
    );

    populateSelect(
      equipmentFilter,
      catalog
        .equipmentOptions,
      {
        value: "all",
        label: "전체 장비"
      }
    );

    populateSelect(
      equipmentInput,
      catalog
        .equipmentOptions
    );

    populateSelect(
      primaryBodyPartInput,
      catalog.bodyParts
    );
  }

  function setSummary(
    title,
    description
  ) {
    if (!selectedSummary) {
      return;
    }

    selectedSummary.innerHTML = `
      <strong>
        ${escapeHtml(title)}
      </strong>

      <span>
        ${escapeHtml(description)}
      </span>
    `;
  }

  function hideMappingSuggestion() {
    suggestedTemplateId = "";

    suggestionElement
      ?.classList.add(
        "hidden"
      );
  }

  function showMappingSuggestion(
    exercise
  ) {
    hideMappingSuggestion();

    if (
      !catalog ||
      !exercise ||
      catalog.normalizeTemplateId(
        exercise.templateId
      )
    ) {
      return;
    }

    /*
    * 이름이나 별칭이 정확히 일치할 때만
    * 기존 운동의 연결을 제안합니다.
    */
    const template =
      catalog.findTemplateByName(
        exercise.name
      );

    if (!template) {
      return;
    }

    suggestedTemplateId =
      template.id;

    if (suggestionTitle) {
      suggestionTitle.textContent =
        `"${template.name}" 종목과 연결할 수 있습니다.`;
    }

    if (suggestionDescription) {
      suggestionDescription.textContent =
        [
          `기존 이름 "${exercise.name}"이`,
          "카탈로그의 이름 또는 별칭과 정확히 일치합니다.",
          "연결 후 운동 설정을 저장해야 실제로 반영됩니다."
        ].join(" ");
    }

    suggestionElement
      ?.classList.remove(
        "hidden"
      );
  }

  function getSuggestedTemplate() {
    if (!suggestedTemplateId) {
      return null;
    }

    return (
      catalog
        ?.getTemplateById(
          suggestedTemplateId
        ) ||
      null
    );
  }

  function getSelectedTemplateId() {
    return catalog
      ?.normalizeTemplateId(
        templateIdInput?.value
      ) || "";
  }

  function renderResults() {
    if (
      !catalog ||
      !resultsElement
    ) {
      return;
    }

    const selectedTemplateId =
      getSelectedTemplateId();

    const results =
      catalog.searchTemplates({
        query:
          searchInput?.value ||
          "",

        bodyPart:
          bodyPartFilter?.value ||
          "all",

        equipment:
          equipmentFilter?.value ||
          "all"
      });

    if (results.length === 0) {
      resultsElement.innerHTML = `
        <div
          class="exercise-catalog-empty"
        >
          조건에 맞는 운동이 없습니다.
        </div>
      `;
    } else {
      resultsElement.innerHTML =
        results.map(
          (template) => {
            const bodyPartLabel =
              catalog
                .getBodyPartLabel(
                  template
                    .primaryBodyPart
                );

            const equipmentLabels =
              template
                .recommendedEquipment
                .slice(0, 3)
                .map(
                  (equipment) =>
                    catalog
                      .getEquipmentLabel(
                        equipment
                      )
                )
                .join(" · ");

            const selected =
              template.id ===
              selectedTemplateId;

            return `
              <button
                class="exercise-catalog-result ${
                  selected
                    ? "selected"
                    : ""
                }"
                type="button"
                data-template-id="${escapeHtml(
                  template.id
                )}"
                role="option"
                aria-selected="${String(
                  selected
                )}"
              >
                <span>
                  <strong>
                    ${escapeHtml(
                      template.name
                    )}
                  </strong>

                  <small>
                    ${escapeHtml(
                      bodyPartLabel
                    )}
                  </small>
                </span>

                <em>
                  ${escapeHtml(
                    equipmentLabels ||
                    "장비 자유 선택"
                  )}
                </em>
              </button>
            `;
          }
        ).join("");
    }

    if (resultMessage) {
      resultMessage.textContent =
        `${results.length}개 운동을 찾았습니다. 실제 장비는 선택 후 자유롭게 변경할 수 있습니다.`;
    }
  }

  function setCustomExercise(
    options = {}
  ) {
    const source =
      options.source ===
        "legacy"
        ? "legacy"
        : "custom";

    hideMappingSuggestion();

    if (templateIdInput) {
      templateIdInput.value = "";
    }

    if (sourceInput) {
      sourceInput.value =
        source;
    }

    if (nameInput) {
      nameInput.readOnly =
        false;

      if (
        options.clearName ===
        true
      ) {
        nameInput.value = "";
      }
    }

    if (primaryBodyPartInput) {
      primaryBodyPartInput
        .disabled = false;

      primaryBodyPartInput
        .value =
          catalog
            ?.normalizeBodyPart(
              options
                .primaryBodyPart
            ) ||
          "other";
    }

    setSummary(
      source === "legacy"
        ? "기존 직접 입력 운동"
        : "직접 입력 운동",
      "운동 이름, 부위, 장비와 중량 조절 간격을 직접 설정합니다."
    );

    renderResults();
  }

  function selectTemplate(
    templateId,
    options = {}
  ) {
    const template =
      catalog
        ?.getTemplateById(
          templateId
        );

    if (!template) {
      return false;
    }

    hideMappingSuggestion();

    if (templateIdInput) {
      templateIdInput.value =
        template.id;
    }

    if (sourceInput) {
      sourceInput.value =
        "builtin";
    }

    if (nameInput) {
      nameInput.value =
        template.name;

      nameInput.readOnly =
        true;
    }

    if (primaryBodyPartInput) {
      primaryBodyPartInput
        .value =
          template
            .primaryBodyPart;

      primaryBodyPartInput
        .disabled = true;
    }

    if (
      equipmentInput &&
      options
        .preserveEquipment !==
          true
    ) {
      const firstEquipment =
        template
          .recommendedEquipment[0];

      equipmentInput.value =
        firstEquipment ||
        "other";
    }

    const bodyPartLabel =
      catalog
        .getBodyPartLabel(
          template
            .primaryBodyPart
        );

    setSummary(
      template.name,
      `${bodyPartLabel} 운동 템플릿 · 실제 장비는 아래에서 자유롭게 선택`
    );

    renderResults();

    return true;
  }

  function openForExercise(
    exercise
  ) {
    if (!catalog) {
      return;
    }

    if (searchInput) {
      searchInput.value = "";
    }

    if (bodyPartFilter) {
      bodyPartFilter.value =
        "all";
    }

    if (equipmentFilter) {
      equipmentFilter.value =
        "all";
    }

    const equipment =
      catalog
        .normalizeEquipment(
          exercise?.equipment
        );

    if (equipmentInput) {
      equipmentInput.value =
        equipment;
    }

    const templateId =
      catalog
        .normalizeTemplateId(
          exercise?.templateId
        );

    if (templateId) {
      selectTemplate(
        templateId,
        {
          preserveEquipment:
            true
        }
      );

      if (equipmentInput) {
        equipmentInput.value =
          equipment;
      }

      return;
    }

    if (nameInput) {
      nameInput.value =
        String(
          exercise?.name ||
          ""
        );
    }

    setCustomExercise({
      source:
        exercise?.source ===
          "legacy"
          ? "legacy"
          : "custom",

      primaryBodyPart:
        exercise
          ?.primaryBodyPart
    });

    showMappingSuggestion(
      exercise
    );
  }

  function openForCreate() {
    hideMappingSuggestion();

    if (searchInput) {
      searchInput.value = "";
    }

    if (bodyPartFilter) {
      bodyPartFilter.value =
        "all";
    }

    if (equipmentFilter) {
      equipmentFilter.value =
        "all";
    }

    if (equipmentInput) {
      equipmentInput.value =
        "other";
    }

    setCustomExercise({
      clearName: true,
      source: "custom",
      primaryBodyPart:
        "other"
    });
  }

  function getDraft() {
    const templateId =
      getSelectedTemplateId();

    const source =
      templateId
        ? "builtin"
        : sourceInput?.value ===
            "legacy"
          ? "legacy"
          : "custom";

    return {
      templateId,

      equipment:
        catalog
          ?.normalizeEquipment(
            equipmentInput?.value
          ) ||
        "other",

      primaryBodyPart:
        catalog
          ?.normalizeBodyPart(
            primaryBodyPartInput
              ?.value
          ) ||
        "other",

      source
    };
  }

  function initialize() {
    if (initialized) {
      return;
    }

    initialized = true;

    if (!catalog) {
      if (resultMessage) {
        resultMessage.textContent =
          "운동 종목 카탈로그를 불러오지 못했습니다.";
      }

      return;
    }

    populateControls();

    searchInput
      ?.addEventListener(
        "input",
        renderResults
      );

    bodyPartFilter
      ?.addEventListener(
        "change",
        renderResults
      );

    equipmentFilter
      ?.addEventListener(
        "change",
        renderResults
      );

    resultsElement
      ?.addEventListener(
        "click",
        (event) => {
          if (
            !(
              event.target
                instanceof Element
            )
          ) {
            return;
          }

          const button =
            event.target.closest(
              "[data-template-id]"
            );

          if (!button) {
            return;
          }

          selectTemplate(
            button.dataset
              .templateId
          );
        }
      );

    customButton
      ?.addEventListener(
        "click",
        () => {
          setCustomExercise({
            clearName: true,
            source: "custom",
            primaryBodyPart:
              "other"
          });

          nameInput?.focus();
        }
      );

    acceptSuggestionButton
      ?.addEventListener(
        "click",
        () => {
          const templateId =
            suggestedTemplateId;

          if (!templateId) {
            return;
          }

          const currentEquipment =
            catalog
              .normalizeEquipment(
                equipmentInput
                  ?.value
              );

          /*
          * 기존 장비가 지정되어 있다면 유지하고,
          * ‘기타’ 상태라면 템플릿의 첫 추천 장비를 사용합니다.
          */
          const preserveEquipment =
            currentEquipment !==
            "other";

          const selected =
            selectTemplate(
              templateId,
              {
                preserveEquipment
              }
            );

          if (
            selected &&
            searchInput
          ) {
            searchInput.value =
              catalog
                .getTemplateById(
                  templateId
                )
                ?.name ||
              "";
          }
        }
      );

    dismissSuggestionButton
      ?.addEventListener(
        "click",
        () => {
          hideMappingSuggestion();

          setSummary(
            "기존 직접 입력 운동",
            "현재 운동 이름과 설정을 그대로 유지합니다."
          );
        }
      );

    renderResults();
  }

  window.JYMLog
    .exerciseCatalogUI =
      Object.freeze({
        initialize,
        openForExercise,
        openForCreate,
        selectTemplate,
        setCustomExercise,
        renderResults,
        getDraft,
        getSuggestedTemplate
      });
})();
