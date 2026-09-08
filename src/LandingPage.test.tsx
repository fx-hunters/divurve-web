import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LandingPage, useInView, Spark } from "./LandingPage";

describe("LandingPage", () => {
  const onEnterMock = vi.fn();
  const setIsDarkMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("히어로 헤드라인, 기능, 스텝 섹션을 렌더링한다", () => {
    render(
      <LandingPage onEnter={onEnterMock} isDark={true} setIsDark={setIsDarkMock} />
    );

    expect(screen.getByText("AI 기반 외화 분할 환전 & 리스크 엔진")).toBeInTheDocument();
    expect(screen.getByText("가장 지능적인 환전 가이드")).toBeInTheDocument();
    expect(screen.getByText("환율 전망")).toBeInTheDocument();
    expect(screen.getByText("USD/KRW 80% 신뢰구간 팬 차트")).toBeInTheDocument();
    expect(
      screen.getByText("화면 구성을 보여주는 표시용 샘플 곡선입니다. 실제 시세가 아닙니다."),
    ).toBeInTheDocument();
    expect(screen.getByText("불확실한 환율 시장의 3대 솔루션")).toBeInTheDocument();
    expect(screen.getByText("환전 목표를 달성하는 4단계 흐름")).toBeInTheDocument();
  });

  it("제거된 어원·성과 지표 섹션과 그 네비 링크를 더 이상 렌더링하지 않는다", () => {
    render(
      <LandingPage onEnter={onEnterMock} isDark={true} setIsDark={setIsDarkMock} />
    );

    expect(screen.queryByText("DIVURVE의 의미")).not.toBeInTheDocument();
    expect(screen.queryByText("목표 환전 단가 방어율")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "어원" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "성과 지표" })).not.toBeInTheDocument();
  });

  it("상단 네비 헤더가 스크롤에도 상단에 고정된다", () => {
    const { container } = render(
      <LandingPage onEnter={onEnterMock} isDark={true} setIsDark={setIsDarkMock} />
    );

    const header = container.querySelector("header");
    expect(header).toHaveStyle({ position: "sticky", top: "0px" });
  });

  it("CTA 및 로고 클릭 시 콜백이 호출된다", () => {
    const onLoginMock = vi.fn();
    const onSignupMock = vi.fn();

    render(
      <LandingPage
        onEnter={onEnterMock}
        onLogin={onLoginMock}
        onSignup={onSignupMock}
        isDark={true}
        setIsDark={setIsDarkMock}
      />
    );

    const loginBtn = screen.getByRole("button", { name: "로그인" });
    fireEvent.click(loginBtn);
    expect(onLoginMock).toHaveBeenCalledTimes(1);

    const signupBtn = screen.getByRole("button", { name: /회원가입/ });
    fireEvent.click(signupBtn);
    expect(onSignupMock).toHaveBeenCalledTimes(1);

    const startBtns = screen.getAllByRole("button", { name: /무료로 시작하기/ });
    expect(startBtns).toHaveLength(2);
    fireEvent.click(startBtns[0]);
    expect(onEnterMock).toHaveBeenCalledTimes(1);
    fireEvent.click(startBtns[1]);
    expect(onEnterMock).toHaveBeenCalledTimes(2);

    // 로고 클릭
    const logoEl = screen.getByRole("button", { name: "D DIVURVE" });
    fireEvent.click(logoEl);
    expect(onEnterMock).toHaveBeenCalledTimes(3);

    // 키보드 Enter
    fireEvent.keyDown(logoEl, { key: "Enter" });
    expect(onEnterMock).toHaveBeenCalledTimes(4);

    // 키보드 Space
    fireEvent.keyDown(logoEl, { key: " " });
    expect(onEnterMock).toHaveBeenCalledTimes(5);

    // 다른 키
    fireEvent.keyDown(logoEl, { key: "Escape" });
    expect(onEnterMock).toHaveBeenCalledTimes(5);
  });

  it("onLogin·onSignup이 없으면 onEnter로 대체된다", () => {
    render(
      <LandingPage onEnter={onEnterMock} isDark={true} setIsDark={setIsDarkMock} />
    );

    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    fireEvent.click(screen.getByRole("button", { name: /회원가입/ }));
    expect(onEnterMock).toHaveBeenCalledTimes(2);
  });

  it("테마 전환 버튼 클릭 시 setIsDark가 호출된다", () => {
    render(
      <LandingPage onEnter={onEnterMock} isDark={true} setIsDark={setIsDarkMock} />
    );

    const themeBtn = screen.getByRole("button", { name: "테마 전환" });
    fireEvent.click(themeBtn);
    expect(setIsDarkMock).toHaveBeenCalledWith(false);
  });

  it("라이트 모드일 때 테마 토글 버튼이 moon 아이콘 상태로 렌더링된다", () => {
    render(
      <LandingPage onEnter={onEnterMock} isDark={false} setIsDark={setIsDarkMock} />
    );

    const themeBtn = screen.getByRole("button", { name: "테마 전환" });
    fireEvent.click(themeBtn);
    expect(setIsDarkMock).toHaveBeenCalledWith(true);
  });

  it("스텝 카드 마우스 호버 시 세부 항목이 인터랙션된다", () => {
    render(
      <LandingPage onEnter={onEnterMock} isDark={true} setIsDark={setIsDarkMock} />
    );

    const stepEl = screen.getByText("01");
    const parentCard = stepEl.closest("div")?.parentElement;
    if (parentCard) {
      fireEvent.mouseEnter(parentCard);
      expect(screen.getByText("통화 선택 (USD / JPY / EUR)")).toBeInTheDocument();
      fireEvent.mouseLeave(parentCard);
    }
  });

  it("피처 카드 및 CTA 버튼 마우스 호버 이벤트가 정상 동작한다", () => {
    render(
      <LandingPage onEnter={onEnterMock} isDark={true} setIsDark={setIsDarkMock} />
    );

    const featCard = screen.getByText("몬테카를로 팬 차트 전망").closest("div")?.parentElement;
    if (featCard) {
      fireEvent.mouseEnter(featCard);
      fireEvent.mouseLeave(featCard);
    }

    for (const ctaBtn of screen.getAllByRole("button", { name: /무료로 시작하기/ })) {
      fireEvent.mouseEnter(ctaBtn);
      fireEvent.mouseLeave(ctaBtn);
    }

    const headerCtaBtn = screen.getByRole("button", { name: /회원가입/ });
    fireEvent.mouseEnter(headerCtaBtn);
    fireEvent.mouseLeave(headerCtaBtn);

    const exploreLink = screen.getByRole("link", { name: /기능 살펴보기/ });
    fireEvent.mouseEnter(exploreLink);
    fireEvent.mouseLeave(exploreLink);
  });
});

describe("LandingPage 스크롤 스파이 네비", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("현재 스크롤 위치에 해당하는 네비 탭을 강조한다", () => {
    const callbacks: ((entries: unknown[]) => void)[] = [];
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn((cb: (entries: unknown[]) => void) => {
        callbacks.push(cb);
        return { observe: vi.fn(), disconnect: vi.fn() };
      })
    );

    render(<LandingPage onEnter={vi.fn()} isDark={true} setIsDark={vi.fn()} />);

    const featuresLink = screen.getByRole("link", { name: "기능" });
    const howLink = screen.getByRole("link", { name: "작동 방식" });
    expect(featuresLink).not.toHaveAttribute("aria-current");
    expect(howLink).not.toHaveAttribute("aria-current");

    act(() => {
      callbacks.forEach((cb) =>
        cb([{ target: { id: "features" }, intersectionRatio: 0.8, isIntersecting: true }])
      );
    });
    expect(featuresLink).toHaveAttribute("aria-current", "true");
    expect(howLink).not.toHaveAttribute("aria-current");

    act(() => {
      callbacks.forEach((cb) =>
        cb([
          { target: { id: "features" }, intersectionRatio: 0.1, isIntersecting: true },
          { target: { id: "how-it-works" }, intersectionRatio: 0.9, isIntersecting: true },
        ])
      );
    });
    expect(howLink).toHaveAttribute("aria-current", "true");
    expect(featuresLink).not.toHaveAttribute("aria-current");
  });
});

describe("Spark", () => {
  it("스파크라인 차트를 정상 렌더링한다", () => {
    const { container } = render(<Spark data={[{ v: 10 }, { v: 20 }]} color="#00ffaa" />);
    expect(container.querySelector(".recharts-responsive-container")).toBeInTheDocument();
  });
});

describe("useInView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("IntersectionObserver 트리거 시 inView가 true로 변경된다", () => {
    let callback: (entries: { isIntersecting: boolean }[]) => void = () => {};
    const observeMock = vi.fn();
    const disconnectMock = vi.fn();

    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn((cb) => {
        callback = cb;
        return {
          observe: observeMock,
          disconnect: disconnectMock,
        };
      })
    );

    function TestComponent() {
      const { ref, inView } = useInView(0.2);
      return <div ref={ref}>{inView ? "IN_VIEW" : "NOT_IN_VIEW"}</div>;
    }

    const { rerender } = render(<TestComponent />);
    expect(screen.getByText("NOT_IN_VIEW")).toBeInTheDocument();

    act(() => callback([{ isIntersecting: false }]));
    rerender(<TestComponent />);
    expect(screen.getByText("NOT_IN_VIEW")).toBeInTheDocument();

    act(() => callback([{ isIntersecting: true }]));
    rerender(<TestComponent />);
    expect(screen.getByText("IN_VIEW")).toBeInTheDocument();
  });

  it("ref가 바인딩되지 않은 컴포넌트에서는 observe를 호출하지 않는다", () => {
    function UnboundComponent() {
      const { inView } = useInView(0.2);
      return <div>{inView ? "IN_VIEW" : "NOT_IN_VIEW"}</div>;
    }

    render(<UnboundComponent />);
    expect(screen.getByText("NOT_IN_VIEW")).toBeInTheDocument();
  });
});
