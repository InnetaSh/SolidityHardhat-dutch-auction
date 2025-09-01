(async function () {
 
    const contractAddrEl = document.getElementById('contractAddr');
    const contractBal = document.getElementById('contractBal');
    const errorDiv = document.getElementById('error');

    const auctionInfoSection = document.getElementById('auction-startPage');
    const accauntInfo = document.getElementById('accauntInfo');
    
    const showCreateBtn = document.getElementById('showCreateBtn');
    const showChoiseBtn = document.getElementById('showChoiseBtn');
    const showAccauntBtn = document.getElementById('showAccauntBtn');
    const choiseBtn = document.getElementById('choiseBtn');

    const WithdrawBtn = document.getElementById('WithdrawBtn');

    const closeBuyAuctionBtn = document.getElementById('closeBuyAuctionBtn');
    const closeCreateAuctionBtn = document.getElementById('closeCreateAuctionBtn');

    const buyBtn = document.getElementById('buyBtn');
    const createBtn = document.getElementById('createBtn');

    createBtn.onclick = createAuction;
    buyBtn.onclick = buyAuction;
    


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


     
            const bal = await contract.getContractBalance();
            console.log(bal);
            contractBal.textContent = bal;


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
        await loadAuctions();
    }


    async function choiseAuction() {
        try {
            auctionInfoSection.classList.add('non-display');
            const select = document.getElementById('id_auctionIndex');
            const index = select.value;

            const container = document.getElementById('info-auction');
            container.classList.remove('non-display');
            console.log(index);


            const thankYouDiv = document.getElementById('thankYouMsg');
            thankYouDiv.innerHTML = `  `;

            buyBtn.classList.remove('non-display');

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

                clearInterval(priceInterval);
                document.getElementById('auction-priceNow').textContent = `Final price: ${finalPrice.toString()} wei`;
                document.getElementById('buyBtn').classList.add('non-display');
                document.getElementById('auction-winner').textContent = `Winner: ${winner.toString()}`;


                document.getElementById('auction-stopped').textContent = `Auction has expired and was stopped automatically.`;
            } else if (stopped) {
                document.getElementById('auction-stopped').textContent = `Auction is already stopped.`;

                clearInterval(priceInterval);
                document.getElementById('auction-priceNow').textContent = `Final price: ${finalPrice.toString()} wei`;
                document.getElementById('buyBtn').classList.add('non-display');
                document.getElementById('auction-winner').textContent = `Winner: ${winner.toString()}`;

                const userAddress = await signer.getAddress();
                if (userAddress.toLowerCase() === seller.toLowerCase()) {
                    WithdrawBtn.classList.remove('non-display');
                }

            } else {
                document.getElementById('auction-stopped').textContent = ``;
            }


            console.log("Auction stopped status:", stopped);

            if (priceInterval) {
                console.log("Clearing previous price interval");
                clearInterval(priceInterval);
            }
            console.log("Setting price interval");
          
            priceInterval = setInterval(async () => {
                try {
                    if (stopped) { 
                        clearInterval(priceInterval);
                        console.log("Auction is stopped, clearing price interval");
                        document.getElementById('auction-priceNow').textContent = `Final price: ${finalPrice.toString()} wei`;
                        document.getElementById('buyBtn').classList.add('non-display');
                        document.getElementById('auction-winner').textContent = `Winner: ${winner.toString()}`;
                        return;
                    }

                    const nowUpdated = BigInt(Math.floor(Date.now() / 1000)); 
                    const priceNow = startingPrice - (nowUpdated - BigInt(startAt)) * BigInt(discountRate);

                    console.log("priceNow");
                    
                    console.log("Calculated priceNow:", priceNow); 

                    document.getElementById('auction-priceNow').textContent = `Current price: ${priceNow} wei`;

                } catch (e) {
                    console.error("Error inside interval: ", e); 
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

            clearInterval(priceInterval);

            const tx = await contract.buy(index, {value: price });
            await tx.wait();


            const winner = await contract.getAuctionWinner(index);
            console.log('Auction bought! Winner: ' + winner);
            document.getElementById('auction-winner').textContent = `Winner: ${winner.toString()}`;


            const item = await contract.getAuctionItem(index);
            const thankYouDiv = document.getElementById('thankYouMsg');
            thankYouDiv.innerHTML = `
                 🎉  ${item} — покупка выполнена успешно!<br>
            `;

            buyBtn.classList.add('non-display');

            alert("Auction bought!");
              } catch (e) {
                alert("Error: " + e.message);
              }
    }



    async function loadAuctions() {
        console.log("length");
        const select = document.getElementById('id_auctionIndex');
        const auctionsCount = await contract.getAuctionsLength();

        select.innerHTML = '<option value="">Choise auction:</option>';

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
        
    }


    function showCreateContainer() {
        const container = document.getElementById('create-auction');
        document.getElementById('buy-auction').classList.add('non-display');
        const isHidden = container.classList.remove('non-display');
        
        auctionInfoSection.classList.add('non-display');
        
    }

    function closeCreateContainer() {
        const container = document.getElementById('create-auction');
        document.getElementById('buy-auction').classList.add('non-display');
        const isHidden = container.classList.add('non-display');
        
        auctionInfoSection.classList.remove('non-display');
      
    }
    function showChoiseContainer() {
        document.getElementById('create-auction').classList.add('non-display');
        const container = document.getElementById('buy-auction');
        const isHidden = container.classList.remove('non-display');

      
        auctionInfoSection.classList.add('non-display');
        
    }

    function closeChoiseContainer() {
        document.getElementById('create-auction').classList.add('non-display');
        const container = document.getElementById('buy-auction');
        const isHidden = container.classList.add('non-display');
        
       
        auctionInfoSection.classList.remove('non-display');
      
    }

    function showAccauntInfoContainer() {
        const isHidden = accauntInfo.classList.toggle('non-display');
       
        showAccauntBtn.textContent = isHidden ? 'Accaunt info' : 'Close accaunt info';
    }




    showCreateBtn.addEventListener('click', showCreateContainer);
    closeCreateAuctionBtn.addEventListener('click', closeCreateContainer);
    showChoiseBtn.addEventListener('click', showChoiseContainer);
    closeBuyAuctionBtn.addEventListener('click', closeChoiseContainer);
    showAccauntBtn.addEventListener('click', showAccauntInfoContainer);
    choiseBtn.addEventListener('click', choiseAuction);



    window.onload = connect;
    


    await loadConfig();
 }) ();
