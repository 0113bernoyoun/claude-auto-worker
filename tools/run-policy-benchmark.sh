#!/bin/bash

# 🚀 Policy Performance Benchmark Runner
# TASK-093: 대량 정책 성능 벤치(간이)

set -e

echo "🚀 Policy Performance Benchmark Tool"
echo "===================================="
echo "TASK-093: 대량 정책 성능 벤치(간이)"
echo ""

# 스크립트 디렉토리로 이동
cd "$(dirname "$0")"

# Node.js 버전 확인
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"

# 메모리 제한 설정 (가비지 컬렉션 활성화)
export NODE_OPTIONS="--max-old-space-size=4096 --expose-gc"

echo ""
echo "🔍 Running basic policy performance benchmark..."
node policy-performance-benchmark.js

echo ""
echo "🔧 Running integration policy engine benchmark..."
node policy-engine-benchmark.js

echo ""
echo "✅ All benchmarks completed successfully!"
echo "📊 Check the generated report files for detailed results."
echo ""
echo "📁 Generated reports:"
echo "  - policy-performance-report.json"
echo "  - policy-engine-benchmark-report.json"
echo ""
echo "📝 Copy the baseline data above to README.md for future reference."
