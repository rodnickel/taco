// ============================================
// Script para testar latência real do monitor
// Execute no servidor onde o worker roda
// ============================================

async function testLatency(url, iterations = 5) {
  console.log(`\n🔍 Testando latência para: ${url}`)
  console.log(`📊 Realizando ${iterations} requisições...\n`)

  const results = []

  for (let i = 1; i <= iterations; i++) {
    const startTime = Date.now()

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Taco-Monitor/1.0',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      const latency = Date.now() - startTime
      const statusCode = response.status

      console.log(`  ${i}. Status: ${statusCode} | Latência: ${latency}ms`)
      results.push(latency)

    } catch (err) {
      const latency = Date.now() - startTime
      console.log(`  ${i}. ERRO: ${err.message} | Tempo: ${latency}ms`)
      results.push(latency)
    }

    // Aguardar 500ms entre requisições
    if (i < iterations) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  // Calcular estatísticas
  const avg = results.reduce((a, b) => a + b, 0) / results.length
  const min = Math.min(...results)
  const max = Math.max(...results)

  console.log(`\n📈 Estatísticas:`)
  console.log(`   Média: ${avg.toFixed(2)}ms`)
  console.log(`   Mínima: ${min}ms`)
  console.log(`   Máxima: ${max}ms`)
  console.log(`   Variação: ${(max - min)}ms`)

  return { avg, min, max, results }
}

// Testar vários sites
async function runTests() {
  console.log('='  .repeat(60))
  console.log('🚀 TESTE DE LATÊNCIA - Taco Monitor Worker')
  console.log('='  .repeat(60))

  // Sites para testar
  const sites = [
    'https://uniitalo.com.br',
    'https://google.com',
    'https://cloudflare.com',
  ]

  for (const site of sites) {
    await testLatency(site, 5)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Testes concluídos!')
  console.log('='.repeat(60))
}

// Executar
runTests().catch(console.error)
