import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DetailedDiagnosisInvite } from "./detailed-diagnosis-invite";

describe("DetailedDiagnosisInvite", () => {
  it("홈 위에서 상세 진단 의미를 안내하고 한 번만 시작한다", () => {
    const onStart = vi.fn();
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const { unmount } = render(
      <DetailedDiagnosisInvite onStart={onStart} onDismiss={vi.fn()} />,
    );

    expect(screen.getByRole("dialog")).toHaveTextContent("3문항만 더 답하면");
    const startButton = screen.getByRole("button", {
      name: "지금 맞춤 설정하기",
    });
    expect(startButton).toHaveFocus();
    fireEvent.click(startButton);
    fireEvent.click(startButton);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(startButton).toBeDisabled();

    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it("나중에 하기를 선택하면 마이페이지 재개 경로를 안내한다", () => {
    const onStart = vi.fn();
    const onDismiss = vi.fn();
    render(
      <DetailedDiagnosisInvite onStart={onStart} onDismiss={onDismiss} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "나중에 할게요" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "마이페이지 → 의사결정 프로필에서 언제든 이어갈 수 있어요",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "지금 맞춤 설정하기" }),
    );
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("확인, 닫기, 배경, Escape로 안내를 닫는다", () => {
    const onDismiss = vi.fn();
    const { unmount } = render(
      <DetailedDiagnosisInvite onStart={vi.fn()} onDismiss={onDismiss} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "나중에 할게요" }));
    fireEvent.click(screen.getByRole("button", { name: "확인했어요" }));
    fireEvent.keyDown(window, { key: "Escape" });
    const closeButtons = screen.getAllByRole("button", {
      name: "상세 진단 안내 닫기",
    });
    fireEvent.click(closeButtons[0]!);
    fireEvent.click(closeButtons[1]!);
    expect(onDismiss).toHaveBeenCalledTimes(4);
    unmount();
  });

  it("Escape가 아닌 키는 안내를 닫지 않는다", () => {
    const onDismiss = vi.fn();
    render(
      <DetailedDiagnosisInvite onStart={vi.fn()} onDismiss={onDismiss} />,
    );
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
