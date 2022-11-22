import { render } from "@testing-library/react";

import App from "./app";

describe("App", () => {
    it("should render successfully", () => {
        const { baseElement } = render(<App vs="" currentPath="testPath" project={true} />);

        expect(baseElement).toBeTruthy();
    });
});
