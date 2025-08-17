import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders health chatbot app", () => {
  render(<App />);
  const headerElement = screen.getByText(/Elyx Health Concierge/i);
  expect(headerElement).toBeInTheDocument();
});
