/**
 * CircuitBreaker - 障害検知と自動復旧
 * V2.2 Security Architecture
 * 
 * 連続失敗時にAPIへのリクエストを一時停止
 */

interface CircuitState {
    failures: number;
    lastFailure: number;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

const FAILURE_THRESHOLD = 3;
const RESET_TIMEOUT = 30000; // 30秒

// シングルトン状態（Serverlessでは各インスタンスで独立）
const circuitState: CircuitState = {
    failures: 0,
    lastFailure: 0,
    state: 'CLOSED',
};

/**
 * Circuit Breakerの状態を取得
 */
export function getCircuitState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    if (circuitState.state === 'OPEN') {
        // タイムアウト後はHALF_OPENに移行
        if (Date.now() - circuitState.lastFailure > RESET_TIMEOUT) {
            circuitState.state = 'HALF_OPEN';
            return 'HALF_OPEN';
        }
        return 'OPEN';
    }
    return circuitState.state;
}

/**
 * Circuitが開いているか確認
 */
export function isCircuitOpen(): boolean {
    return getCircuitState() === 'OPEN';
}

/**
 * 失敗を記録
 */
export function recordFailure(): void {
    circuitState.failures++;
    circuitState.lastFailure = Date.now();

    if (circuitState.failures >= FAILURE_THRESHOLD) {
        circuitState.state = 'OPEN';
        console.warn(`[CircuitBreaker] Circuit OPENED after ${circuitState.failures} failures`);
    }
}

/**
 * 成功を記録（circuitをリセット）
 */
export function recordSuccess(): void {
    circuitState.failures = 0;
    circuitState.state = 'CLOSED';
}

/**
 * Circuit Breakerの状態をリセット（テスト用）
 */
export function resetCircuit(): void {
    circuitState.failures = 0;
    circuitState.lastFailure = 0;
    circuitState.state = 'CLOSED';
}
