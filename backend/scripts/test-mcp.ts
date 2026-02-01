/**
 * TEST SCRIPT: MCP Tool Listing
 */
async function testMCP() {
    console.log('--- MCP ENDPOINT TEST ---');

    try {
        const response = await fetch('http://localhost:9002/api/mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method: 'list_tools', params: {} })
        });

        if (!response.ok) {
            console.error(`Status: ${response.status}`);
            const text = await response.text();
            console.error(`Body: ${text}`);
            return;
        }

        const data = await response.json();
        console.log('Tools available:', JSON.stringify(data.tools, null, 2));

        if (data.tools?.some((t: any) => t.name === 'search_universe_memory')) {
            console.log('\nSussess: search_universe_memory is listed!');
        } else {
            console.error('\nFailure: search_universe_memory not found in tool list.');
        }
    } catch (err: any) {
        console.error(`Fetch error: ${err.message}`);
        console.log('Note: Ensure the dev server is running on port 9002.');
    }
}

testMCP();
