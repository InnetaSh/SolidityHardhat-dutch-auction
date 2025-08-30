(async function () {
 
    const contractAddrEl = document.getElementById('contractAddr');
    const errorDiv = document.getElementById('error');
    
    const showCreateBtn = document.getElementById('showCreateBtn');
    const showChoiseBtn = document.getElementById('showChoiseBtn');
    const choiseBtn = document.getElementById('choiseBtn');

    document.getElementById('createBtn').onclick = createAuction;
    document.getElementById('buyBtn').onclick = buyAuction;
    document.getElementById('infoBtn').onclick = getAuctionInfo;
    


    let provider, signer, contract, cfg;
    let isConnecting = false;
    let isStopped = false;
    let priceInterval;

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


    async function choiseAuction() {
        try {
            const select = document.getElementById('id_auctionIndex');
            const index = select.value;

            const container = document.getElementById('info-auction');
            container.classList.remove('non-display');
            console.log(index);

            if (index === '') return;
            
            const auction = await contract.getAuction(index);

            
            const [
                seller,
                startingPrice,
                finalPrice,
                startAt,
                endsAt,
                discountRate,
                item,
                stopped,
                withdrawn,
                feeWithdrawn,
                winner
            ] = auction;
            
            document.getElementById('auction-item').textContent = `Item: ${item}`;
            document.getElementById('auction-startAt').textContent = `Starts at: ${new Date(Number(startAt) * 1000).toLocaleString() }`;
            document.getElementById('auction-endsAt').textContent = `Ends at: ${new Date(Number(endsAt) * 1000).toLocaleString() }`;
            document.getElementById('auction-startingPrice').textContent = `Starting price: ${startingPrice.toString()} wei`;

            const now = Math.floor(Date.now() / 1000); 

            if (!stopped && now > Number(endsAt)) {
            
                const tx = await contract.stopAuctionIfExpired(index);
                await tx.wait(); 

              
                document.getElementById('auction-stopped').textContent = `Auction has expired and was stopped automatically.`;
            } else if (stopped) {
                document.getElementById('auction-stopped').textContent = `Auction is already stopped.`;
            } else {
                document.getElementById('auction-stopped').textContent = ``;
            }


            console.log(stopped);
           
            if (priceInterval) clearInterval(priceInterval);
          
            priceInterval = setInterval(async () => {
                try {
                    const priceNow = await contract.getPriceFor(index);
                    document.getElementById('auction-priceNow').textContent = `Current price: ${priceNow.toString()} wei`;

                } catch (e) {
                    document.getElementById('auction-priceNow').textContent = `Error fetching price`;
                    clearInterval(priceInterval);
                }
            }, 1000);
            
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

            if (isStopped) {
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
            isStopped = await contract.getAuctionIsStopped(i);

            const option = document.createElement('option');
            option.value = i;
            if(isStopped) option.textContent = `${item} (stopped)`; else option.textContent = item;
           
            select.appendChild(option);
        }
        if (!res.ok) { log('contractConfig.json not found. Deploy the contract first.'); return; }
    }


    function showCreateContainer() {
        const container = document.getElementById('create-auction');
        const isHidden = container.classList.toggle('non-display');

      
        showCreateBtn.textContent = isHidden ? 'Create Auction' : 'Close Create Auction';
    }
    function showChoiseContainer() {
        const container = document.getElementById('buy-auction');
        const isHidden = container.classList.toggle('non-display');

      
        showChoiseBtn.textContent = isHidden ? 'Buy from Auction' : 'Close Buy from Auction';
    }




    showCreateBtn.addEventListener('click', showCreateContainer);
    showChoiseBtn.addEventListener('click', showChoiseContainer);
    choiseBtn.addEventListener('click', choiseAuction);



    window.onload = connect;
    


    await loadConfig();
 }) ();
