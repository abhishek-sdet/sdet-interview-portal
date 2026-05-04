async function test() {
    try {
        await fetch('https://non-existent-host.example.com');
    } catch (e) {
        console.log('Code:', e.code);
        console.log('Message:', e.message);
        console.log('Name:', e.name);
        console.log('Cause:', e.cause);
    }
}
test();
