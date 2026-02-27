import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { log, logError, logVerbose, setLogLevel } from "./log.js";

describe("log module", () => {
	let logSpy: ReturnType<typeof spyOn>;
	let errorSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		setLogLevel("minimal");
		logSpy = spyOn(console, "log").mockImplementation(() => {});
		errorSpy = spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		logSpy.mockRestore();
		errorSpy.mockRestore();
	});

	describe("log()", () => {
		it("outputs with [luthier] prefix in minimal mode", () => {
			log("hello");
			expect(logSpy).toHaveBeenCalledWith("[luthier] hello");
		});

		it("passes extra args", () => {
			log("hello", 42, { key: "val" });
			expect(logSpy).toHaveBeenCalledWith("[luthier] hello", 42, { key: "val" });
		});

		it("outputs in verbose mode", () => {
			setLogLevel("verbose");
			log("hello");
			expect(logSpy).toHaveBeenCalled();
		});

		it("is silent in silent mode", () => {
			setLogLevel("silent");
			log("hello");
			expect(logSpy).not.toHaveBeenCalled();
		});
	});

	describe("logVerbose()", () => {
		it("is silent in minimal mode", () => {
			logVerbose("detail");
			expect(logSpy).not.toHaveBeenCalled();
		});

		it("outputs in verbose mode", () => {
			setLogLevel("verbose");
			logVerbose("detail");
			expect(logSpy).toHaveBeenCalledWith("[luthier] [verbose] detail");
		});

		it("is silent in silent mode", () => {
			setLogLevel("silent");
			logVerbose("detail");
			expect(logSpy).not.toHaveBeenCalled();
		});
	});

	describe("logError()", () => {
		it("outputs to stderr with error prefix in minimal mode", () => {
			logError("something broke");
			expect(errorSpy).toHaveBeenCalledWith("[luthier] [error] something broke");
		});

		it("outputs in verbose mode", () => {
			setLogLevel("verbose");
			logError("something broke");
			expect(errorSpy).toHaveBeenCalled();
		});

		it("is silent in silent mode", () => {
			setLogLevel("silent");
			logError("something broke");
			expect(errorSpy).not.toHaveBeenCalled();
		});

		it("passes extra args", () => {
			logError("fail", new Error("oops"));
			expect(errorSpy).toHaveBeenCalledWith("[luthier] [error] fail", expect.any(Error));
		});
	});

	describe("setLogLevel()", () => {
		it("changes behavior dynamically", () => {
			setLogLevel("silent");
			log("should not appear");
			expect(logSpy).not.toHaveBeenCalled();

			setLogLevel("verbose");
			logVerbose("should appear");
			expect(logSpy).toHaveBeenCalled();
		});
	});
});
