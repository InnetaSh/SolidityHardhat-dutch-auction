(async function () {
 
    const contractAddrEl = document.getElementById('contractAddr');

    document.getElementById('createBtn').onclick = createAuction;
    document.getElementById('buyBtn').onclick = buyAuction;
    document.getElementById('infoBtn').onclick = getAuctionInfo;
    const errorDiv = document.getElementById('error'); 


    let provider, signer, contract, cfg;
    let isConnecting = false;
    let isStopped = false;

    async function loadConfig() {
        const res = await fetch('contractConfig.json');
        if (!res.ok) {
            log('contractConfig.json not found. Deploy the contract first.');
        return;
            }
        cfg = await res.json();
        contractAddrEl.textContent = cfg.address;
     }


    async function connect() {

        if(isConnecting) return;  
        isConnecting = true;

        try {
            if (!window.ethereum) {
                alert("Please install MetaMask!");
                return;
            }

        provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = await provider.getSigner();
        contract = new ethers.Contract(cfg.address, cfg.abi, signer);


            await loadAuctions();

        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            isConnecting = false; 
        }
    }

    async function createAuction() {
      try {
            const item = document.getElementById("item").value;
        const startingPrice = ethers.parseUnits(document.getElementById("startingPrice").value, "wei");
        const discountRate = ethers.parseUnits(document.getElementById("discountRate").value, "wei");
        const duration = Number(document.getElementById("duration").value);

        const tx = await contract.createAuction(startingPrice, discountRate, item, duration);
        await tx.wait();
        alert("Auction created!");
          } catch (e) {
            alert("Error: " + e.message);
          }
    }

    async function buyAuction() {
        try {
            const select = document.getElementById('id_auctionIndex');
            const index = select.value;
            console.log(index);

            isStopped = await contract.getAuctionIsStopped(index);
            console.log(isStopped);

            if (!isStopped) {
                errorDiv.textContent = 'Auction is stopped.';

                setTimeout(() => {
                    errorDiv.textContent = '';
                }, 3000);
                return;
            }
      
            const price = await contract.getPriceFor(index);

            const tx = await contract.buy(index, {value: price });
            await tx.wait();
            alert("Auction bought!");
              } catch (e) {
                alert("Error: " + e.message);
              }
    }

    async function getAuctionInfo() {
      try {
        const index = Number(document.getElementById("infoIndex").value);
    const auction = await contract.getAuction(index);

    document.getElementById("infoOutput").textContent = JSON.stringify({
        seller: auction.seller,
        startingPrice: auction.startingPrice.toString(),
        finalPrice: auction.finalPrice.toString(),
        startAt: new Date(auction.startAt * 1000).toLocaleString(),
        endsAt: new Date(auction.endsAt * 1000).toLocaleString(),
        discountRate: auction.discountRate.toString(),
        item: auction.item,
        stopped: auction.stopped,
        withdrawn: auction.withdrawn,
        feeWithdrawn: auction.feeWithdrawn,
        winner: auction.winner,
            }, null, 2);
          } catch (e) {
            alert("Error: " + e.message);
          }
    }


    async function loadAuctions() {
        console.log("length");
        const select = document.getElementById('id_auctionIndex');
        const auctionsCount = await contract.getAuctionsLength();

        select.innerHTML = '<option value="">Buy from Auction</option>';

        const count = Number(auctionsCount);
        console.log(count);

        for (let i = 0; i < count; i++) {
            const item = await contract.getAuctionItem(i);
            const option = document.createElement('option');
            option.value = i;
            option.textContent = item; 
            select.appendChild(option);
        }
        if (!res.ok) { log('contractConfig.json not found. Deploy the contract first.'); return; }
    }




    window.onload = connect;
    


    await loadConfig();
 }) ();
