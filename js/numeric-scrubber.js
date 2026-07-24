(() => {
  "use strict";

  window.JYMLog = window.JYMLog || {};

  const instances = new WeakMap();
  const formatter = new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 4
  });

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round(value) {
    return Math.round(Number(value) * 10000) / 10000;
  }

  function feedback() {
    try {
      navigator.vibrate?.(7);
    } catch {
      // iOS 등 미지원 환경에서는 시각 피드백만 사용합니다.
    }
  }

  function enhance(input) {
    if (!(input instanceof HTMLInputElement) || input.type !== "number") {
      return null;
    }

    if (instances.has(input)) {
      return instances.get(input);
    }

    const wrapper = document.createElement("div");
    wrapper.className = "numeric-scrubber";
    wrapper.innerHTML = `
      <button class="numeric-scrubber-step" type="button" data-step-direction="-1" aria-label="값 감소">−</button>
      <div class="numeric-scrubber-picker" role="spinbutton" tabindex="0">
        <div class="numeric-scrubber-track"></div>
        <span class="numeric-scrubber-center-mark" aria-hidden="true"></span>
      </div>
      <button class="numeric-scrubber-step" type="button" data-step-direction="1" aria-label="값 증가">＋</button>
    `;

    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    input.classList.add("numeric-scrubber-native");
    input.dataset.numericScrubberReady = "true";

    const picker = wrapper.querySelector(".numeric-scrubber-picker");
    const track = wrapper.querySelector(".numeric-scrubber-track");
    const buttons = [...wrapper.querySelectorAll("[data-step-direction]")];

    const accessibleName =
      input.getAttribute(
        "aria-label"
      ) ||
      input.labels?.[0]
        ?.textContent
        ?.trim() ||
      "숫자 값";

    picker.setAttribute(
      "aria-label",
      accessibleName
    );

    buttons.forEach(
      (button) => {
        const direction =
          Number(
            button.dataset
              .stepDirection
          );

        button.setAttribute(
          "aria-label",
          `${accessibleName} ${
            direction < 0
              ? "감소"
              : "증가"
          }`
        );
      }
    );

    let committed = 0;
    let preview = 0;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startValue = 0;
    let mode = "idle";

    function min() {
      return input.min === "" ? -Infinity : number(input.min, -Infinity);
    }

    function max() {
      return input.max === "" ? Infinity : number(input.max, Infinity);
    }

    function step() {
      const sourceId = String(input.dataset.scrubberStepInput || "").trim();
      const sourceValue = sourceId
        ? document.getElementById(sourceId)?.value
        : null;
      const value = Number(
        sourceValue ?? input.dataset.scrubberStep ?? input.step
      );
      return Number.isFinite(value) && value > 0 ? value : 1;
    }

    function unit() {
      return String(input.dataset.scrubberUnit || "");
    }

    function normalize(value) {
      return round(clamp(number(value, committed), min(), max()));
    }

    function label(value) {
      return `${formatter.format(value)}${unit()}`;
    }

    function render(value, offset = 0, snapping = false) {
      preview = normalize(value);
      const currentStep = step();

      const distances =
        input.disabled
          ? [0]
          : [-1, 0, 1];

      track.innerHTML =
        distances
          .map((distance) => {
          const itemValue = round(preview + distance * currentStep);
          const unavailable = itemValue < min() || itemValue > max();
          const classes = [
            "numeric-scrubber-item",
            distance === 0 ? "is-selected" : "",
            Math.abs(distance) === 1 ? "is-near" : "",
            unavailable ? "is-unavailable" : ""
          ].filter(Boolean).join(" ");

          const itemLabel =
            distance === 0
              ? label(
                  itemValue
                )
              : formatter.format(
                  itemValue
                );

          return `
            <span
              class="${classes}"
              aria-hidden="true"
            >
              ${
                unavailable
                  ? ""
                  : itemLabel
              }
            </span>
          `;
        })
        .join("");

      track.style.setProperty("--numeric-scrubber-offset", `${offset}px`);
      track.classList.toggle("is-snapping", snapping);
      picker.setAttribute("aria-valuenow", String(preview));
      picker.setAttribute("aria-valuetext", label(preview));
      picker.setAttribute("aria-valuemin", Number.isFinite(min()) ? String(min()) : "");
      picker.setAttribute("aria-valuemax", Number.isFinite(max()) ? String(max()) : "");
    }

    function syncDisabled() {
      const disabled = Boolean(input.disabled);
      wrapper.classList.toggle("is-disabled", disabled);
      buttons.forEach((button) => {
        button.disabled = disabled;
      });
      picker.tabIndex = disabled ? -1 : 0;
      picker.setAttribute("aria-disabled", String(disabled));
    }

    function sync() {
      const fallback = Number.isFinite(min()) ? min() : 0;
      committed = normalize(number(input.value, fallback));
      input.value = String(committed);
      render(committed);
      syncDisabled();
    }

    function emitChange() {
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function commit(value, emit = true) {
      const next = normalize(value);
      const changed = Math.abs(next - committed) > 0.000001;
      committed = next;
      input.value = String(next);
      render(next, 0, true);
      if (changed && emit) {
        emitChange();
      }
      return next;
    }

    function changeBy(direction) {
      if (input.disabled) {
        return;
      }
      const before = committed;
      const after = commit(committed + direction * step());
      if (Math.abs(after - before) > 0.000001) {
        feedback();
      }
    }

    function openInput() {
      if (input.disabled) {
        return;
      }
      wrapper.classList.add("is-editing");
      input.focus({ preventScroll: true });
      input.select();
    }

    function closeInput() {
      const parsed = Number(input.value);
      if (Number.isFinite(parsed)) {
        committed = normalize(parsed);
      }
      input.value = String(committed);
      wrapper.classList.remove("is-editing");
      render(committed, 0, true);
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        changeBy(Number(button.dataset.stepDirection));
      });
    });

    picker.addEventListener("pointerdown", (event) => {
      if (input.disabled || (event.pointerType === "mouse" && event.button !== 0)) {
        return;
      }
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startValue = committed;
      preview = committed;
      mode = "pending";
    });

    picker.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointerId || mode === "vertical") {
        return;
      }

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (mode === "pending" && absY > 9 && absY > absX) {
        mode = "vertical";
        return;
      }

      if (mode === "pending" && absX >= 8 && absX > absY) {
        mode = "dragging";
        wrapper.classList.add("is-dragging");
        try {
          picker.setPointerCapture(event.pointerId);
        } catch {
          // Pointer Capture 미지원 환경도 허용합니다.
        }
      }

      if (mode !== "dragging") {
        return;
      }

      event.preventDefault();
      const pixels = Math.max(28, number(input.dataset.scrubberPixelsPerStep, 44));
      const index = Math.round(dx / pixels);
      const next = normalize(startValue + index * step());

      if (Math.abs(next - preview) > 0.000001) {
        preview = next;
        feedback();
      }

      const actualIndex = Math.round((preview - startValue) / step());
      const remainder = dx - actualIndex * pixels;
      const offset = -clamp(remainder, -pixels * 0.48, pixels * 0.48);
      render(preview, offset);
    }, { passive: false });

    function finishPointer(event, cancelled = false) {
      if (event.pointerId !== pointerId) {
        return;
      }

      if (mode === "dragging") {
        cancelled ? render(committed, 0, true) : commit(preview);
      } else if (mode === "pending" && !cancelled) {
        openInput();
      }

      try {
        picker.releasePointerCapture(event.pointerId);
      } catch {
        // 별도 처리가 필요하지 않습니다.
      }

      pointerId = null;
      mode = "idle";
      wrapper.classList.remove("is-dragging");
    }

    picker.addEventListener("pointerup", (event) => finishPointer(event));
    picker.addEventListener("pointercancel", (event) => finishPointer(event, true));

    picker.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        event.preventDefault();
        changeBy(-1);
      }
      if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        event.preventDefault();
        changeBy(1);
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openInput();
      }
    });

    input.addEventListener("focus", () => wrapper.classList.add("is-editing"));
    input.addEventListener("change", closeInput);
    input.addEventListener("blur", closeInput);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        input.value = String(committed);
        input.blur();
      }
    });

    const instance = Object.freeze({ input, wrapper, sync });
    instances.set(input, instance);
    sync();
    return instance;
  }

  function enhanceAll(root = document) {
    const inputs = [...root.querySelectorAll(
      'input[type="number"][data-numeric-scrubber]'
    )];
    inputs.forEach(enhance);
    return inputs.length;
  }

  function syncAll(root = document) {
    const inputs = [...root.querySelectorAll(
      'input[type="number"][data-numeric-scrubber]'
    )];
    inputs.forEach((input) => (instances.get(input) || enhance(input))?.sync());
    return inputs.length;
  }

  window.JYMLog.numericScrubber = Object.freeze({
    enhanceAll,
    syncAll
  });
})();
