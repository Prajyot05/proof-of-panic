"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProofOfPanicClient = exports.PublicValuesLayout = exports.ProofOfPanicProgramId = exports.idl = void 0;
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const borsh = __importStar(require("@coral-xyz/borsh"));
const idl_json_1 = __importDefault(require("./idl.json"));
exports.idl = idl_json_1.default;
exports.ProofOfPanicProgramId = new web3_js_1.PublicKey("9YGU7h7TCskUQ2BkZfSVCkb66NzJPES5m5QrW8vUw6hE");
exports.PublicValuesLayout = borsh.struct([
    borsh.array(borsh.u8(), 32, "stateHash"),
    borsh.u32("schemaVersion"),
    borsh.u64("preShockPrice"),
    borsh.u64("postShockPrice"),
    borsh.u64("shockBps"),
    borsh.u8("shockDirectionUp"),
    borsh.u64("maintenanceMarginBps"),
    borsh.u64("liquidationFeeBps"),
    borsh.u64("liquidationTargetMarginBps"),
    borsh.u64("circuitBreakerThreshold"),
    borsh.u64("insuranceFund"),
    borsh.u64("badDebt"),
    borsh.u64("riskScore"),
    borsh.u64("numLiquidated"),
]);
class ProofOfPanicClient {
    constructor(provider, programId = exports.ProofOfPanicProgramId) {
        this.provider = provider;
        this.program = new anchor_1.Program(idl_json_1.default, provider);
    }
    getPDAs() {
        const programId = this.program.programId;
        const [globalStatePda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("global_state")], programId);
        const [riskConfigPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("risk_config")], programId);
        const [positionBookPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("position_book")], programId);
        const [incentivesConfigPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("incentives_config")], programId);
        const [rewardVaultPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("reward_vault")], programId);
        return {
            globalStatePda,
            riskConfigPda,
            positionBookPda,
            incentivesConfigPda,
            rewardVaultPda
        };
    }
    encodePublicValues(values) {
        const buffer = Buffer.alloc(1000);
        const len = exports.PublicValuesLayout.encode(values, buffer);
        return buffer.slice(0, len);
    }
}
exports.ProofOfPanicClient = ProofOfPanicClient;
