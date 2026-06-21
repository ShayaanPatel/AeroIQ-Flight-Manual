'use client';
import { useState } from 'react';

export default function Home() {
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [passengers, setPassengers] = useState({ adults: 1, children: 0, infantsInSeat: 0, infantsOnLap: 0 });
  const [showPassengerDropdown, setShowPassengerDropdown] = useState(false);
  const [flightClass, setFlightClass] = useState('Economy');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [flights, setFlights] = useState([]);
  const [sortBy, setSortBy] = useState('none');
  const [expandedFlight, setExpandedFlight] = useState(null);

  const handleSearch = async () => {
    if (!origin || !destination || !date) {
      setError("Please fill in Origin, Destination, and Depart Date");
      return;
    }
    setError('');
    setLoading(true);
    setFlights([]);
    
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            origin, 
            destination, 
            date, 
            returnDate, 
            passengers,
            flightClass, 
            isRoundTrip 
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch flights');
      }
      
      if (data.flights && data.flights.length > 0) {
         setFlights(data.flights);
      } else {
         setError("No flights could be automatically parsed from the scraped HTML. This is common due to bot protections on flight sites that block standard HTTP requests without Playwright.");
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const swapLocations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const isoStr = timeStr.replace(' ', 'T');
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch(e) {
      return timeStr.split(' ')[1] || timeStr;
    }
  };

  const formatDuration = (mins) => {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h} hr ${m} min`;
  };

  return (
    <div className="container">
       <header className="header">
        <h1 className="main-title">AeroIQ Flight Search Aggregator</h1>
        <p className="subtitle">AI powered search. Find exactly what you need without the hallucinations.</p>
      </header>
       
       <div className="glass-panel horizontal-search-container">
          <div className="trip-options-top">
             <div className="trip-type">
                <label className="radio-group">
                   <input type="radio" name="trip" checked={isRoundTrip} onChange={() => setIsRoundTrip(true)} />
                   <span>Round Trip</span>
                </label>
                <label className="radio-group">
                   <input type="radio" name="trip" checked={!isRoundTrip} onChange={() => setIsRoundTrip(false)} />
                   <span>One Way</span>
                </label>
             </div>
          </div>
          
          <div className="horizontal-search-bar">
             <div className="search-block loc-block">
                <div className="loc-input">
                  <label>FROM</label>
                  <input type="text" placeholder="Origin" value={origin} onChange={(e)=>setOrigin(e.target.value)} />
                </div>
                <button className="swap-btn-inline" onClick={swapLocations}>⇄</button>
                <div className="loc-input">
                  <label>TO</label>
                  <input type="text" placeholder="Destination" value={destination} onChange={(e)=>setDestination(e.target.value)} />
                </div>
             </div>
             
             <div className="divider"></div>

             <div className="search-block date-block">
                <div className="date-input">
                  <label>Depart</label>
                  <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
                </div>
                {isRoundTrip && (
                  <>
                  <div className="divider-small"></div>
                  <div className="date-input">
                    <label>Return</label>
                    <input type="date" value={returnDate} onChange={(e)=>setReturnDate(e.target.value)} />
                  </div>
                  </>
                )}
             </div>

             <div className="divider"></div>

             <div className="search-field passenger-dropdown-wrapper">
                <label>Passengers</label>
                <button 
                  className="passenger-input-btn"
                  onClick={() => setShowPassengerDropdown(!showPassengerDropdown)}
                >
                  {passengers.adults + passengers.children + passengers.infantsInSeat + passengers.infantsOnLap} Passenger{(passengers.adults + passengers.children + passengers.infantsInSeat + passengers.infantsOnLap) > 1 ? 's' : ''}
                </button>
                
                {showPassengerDropdown && (
                  <div className="passenger-popover">
                    <div className="passenger-row">
                      <div className="passenger-type">
                        <span className="passenger-title">Adults</span>
                      </div>
                      <div className="counter-group">
                        <button className="counter-btn" onClick={() => setPassengers({...passengers, adults: Math.max(1, passengers.adults - 1)})} disabled={passengers.adults <= 1}>−</button>
                        <span className="counter-value">{passengers.adults}</span>
                        <button className="counter-btn" onClick={() => setPassengers({...passengers, adults: passengers.adults + 1})}>+</button>
                      </div>
                    </div>
                    
                    <div className="passenger-row">
                      <div className="passenger-type">
                        <span className="passenger-title">Children</span>
                        <span className="passenger-subtitle">Aged 2-11</span>
                      </div>
                      <div className="counter-group">
                        <button className="counter-btn" onClick={() => setPassengers({...passengers, children: Math.max(0, passengers.children - 1)})} disabled={passengers.children <= 0}>−</button>
                        <span className="counter-value">{passengers.children}</span>
                        <button className="counter-btn" onClick={() => setPassengers({...passengers, children: passengers.children + 1})}>+</button>
                      </div>
                    </div>

                    <div className="passenger-row">
                      <div className="passenger-type">
                        <span className="passenger-title">Infants</span>
                        <span className="passenger-subtitle">In seat</span>
                      </div>
                      <div className="counter-group">
                        <button className="counter-btn" onClick={() => setPassengers({...passengers, infantsInSeat: Math.max(0, passengers.infantsInSeat - 1)})} disabled={passengers.infantsInSeat <= 0}>−</button>
                        <span className="counter-value">{passengers.infantsInSeat}</span>
                        <button className="counter-btn" onClick={() => setPassengers({...passengers, infantsInSeat: passengers.infantsInSeat + 1})}>+</button>
                      </div>
                    </div>

                    <div className="passenger-row">
                      <div className="passenger-type">
                        <span className="passenger-title">Infants</span>
                        <span className="passenger-subtitle">On lap</span>
                      </div>
                      <div className="counter-group">
                        <button className="counter-btn" onClick={() => setPassengers({...passengers, infantsOnLap: Math.max(0, passengers.infantsOnLap - 1)})} disabled={passengers.infantsOnLap <= 0}>−</button>
                        <span className="counter-value">{passengers.infantsOnLap}</span>
                        <button className="counter-btn" onClick={() => setPassengers({...passengers, infantsOnLap: passengers.infantsOnLap + 1})}>+</button>
                      </div>
                    </div>

                    <div className="passenger-actions">
                      <button className="cancel-btn" onClick={() => setShowPassengerDropdown(false)}>Cancel</button>
                      <button className="done-btn" onClick={() => setShowPassengerDropdown(false)}>Done</button>
                    </div>
                  </div>
                )}
             </div>

             <div className="divider"></div>

             <div className="search-block class-block">
                <label>Class</label>
                <select value={flightClass} onChange={(e)=>setFlightClass(e.target.value)}>
                   <option value="Economy">Economy</option>
                   <option value="Premium Economy">Premium Economy</option>
                   <option value="Business">Business</option>
                   <option value="First Class">First Class</option>
                </select>
             </div>

             <div className="search-block action-block">
                <button className="search-btn-primary" onClick={handleSearch} disabled={loading}>
                   {loading ? 'Searching...' : 'Search'}
                </button>
             </div>
          </div>
       </div>
       
       {error && <div className="error-message">{error}</div>}
       
       {flights.length > 0 && (
         <div className="results-container">
           <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', padding: '0 1rem', marginBottom: '-0.5rem'}}>
             <label style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Sort By:</label>
             <select 
               value={sortBy} 
               onChange={(e) => setSortBy(e.target.value)}
               style={{width: 'auto', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: '8px', outline: 'none', cursor: 'pointer'}}
             >
               <option value="none" style={{background: '#0b192c', color: 'white'}}>➖ None (Default)</option>
               <option value="cheapest" style={{background: '#0b192c', color: 'white'}}>💸 Cheapest</option>
               <option value="fastest" style={{background: '#0b192c', color: 'white'}}>⚡ Fastest</option>
               <option value="value" style={{background: '#0b192c', color: 'white'}}>🌟 Value for money</option>
             </select>
           </div>
           
           {[...flights].sort((a, b) => {
             if (sortBy === 'cheapest') return a.rawPrice - b.rawPrice;
             if (sortBy === 'fastest') return a.rawDuration - b.rawDuration;
             if (sortBy === 'value') {
               if (a.isBest && !b.isBest) return -1;
               if (!a.isBest && b.isBest) return 1;
               return a.rawPrice - b.rawPrice;
             }
             return 0;
           }).map((flight, idx) => (
              <div 
                key={idx} 
                className="glass-panel flight-card"
                onClick={() => setExpandedFlight(expandedFlight === idx ? null : idx)}
              >
                 <div className="flight-info">
                    {flight.airlineLogo ? (
                      <img src={flight.airlineLogo} alt={flight.provider} className="airline-logo" style={{width: '32px', height: '32px', objectFit: 'contain', background: 'white', borderRadius: '4px', padding: '2px'}} />
                    ) : (
                      <div className="airline-logo" style={{width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px'}}></div>
                    )}
                    <div>
                       <div className="flight-time">{formatTime(flight.departureTime)} – {formatTime(flight.arrivalTime)}</div>
                       <div style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>{flight.provider}</div>
                    </div>
                 </div>
                 
                 <div className="flight-meta">
                    <div style={{fontWeight: '500'}}>{flight.duration}</div>
                    <div style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>{origin} - {destination}</div>
                 </div>
                 
                 <div className="flight-meta">
                    <div style={{fontWeight: '500'}}>{flight.stops}</div>
                 </div>
                 
                 <div>
                    <div style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px', textAlign: 'right'}}>{flight.provider || 'AeroIQ AI'}</div>
                    <div className="flight-price">{flight.price || 'A N/A'}</div>
                    <div style={{color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'right', marginBottom: '8px'}}>{flight.flightNumber}</div>
                    
                    {flight.bookingLink && flight.bookingLink !== '#' && (
                       <a href={flight.bookingLink} onClick={(e) => e.stopPropagation()} target="_blank" rel="noopener noreferrer" style={{
                         display: 'inline-block',
                         background: 'rgba(255, 255, 255, 0.1)',
                         color: 'var(--accent-color)',
                         padding: '6px 12px',
                         borderRadius: '6px',
                         textDecoration: 'none',
                         fontSize: '0.85rem',
                         fontWeight: '600',
                         border: '1px solid rgba(255,255,255,0.1)',
                         transition: 'all 0.2s ease',
                         textAlign: 'center',
                         width: '100%'
                       }}>
                         Book Now
                       </a>
                    )}
                 </div>
                 
                 {expandedFlight === idx && flight.legs && flight.legs.length > 0 && (
                    <div className="flight-details-container" style={{width: '100%'}}>
                       <div className="timeline">
                         {flight.legs.map((leg, legIdx) => (
                           <div key={legIdx}>
                              <div className="timeline-leg">
                                 <div className="timeline-point">
                                    <span className="timeline-time">{formatTime(leg.departure?.time)}</span>
                                    <span className="timeline-airport">{leg.departure?.name} ({leg.departure?.id})</span>
                                 </div>
                                 
                                 <div className="timeline-meta">
                                    Travel time: {formatDuration(leg.durationMins)}
                                 </div>
                                 
                                 <div className="timeline-point">
                                    <span className="timeline-time">{formatTime(leg.arrival?.time)}</span>
                                    <span className="timeline-airport">{leg.arrival?.name} ({leg.arrival?.id})</span>
                                 </div>
                                 
                                 <div className="timeline-meta" style={{marginTop: '0.25rem'}}>
                                    {leg.airline} · {leg.travelClass} · {leg.airplane} · {leg.flightNumber}
                                 </div>
                              </div>
                              
                              {flight.layovers && flight.layovers[legIdx] && (
                                 <div className="timeline-layover">
                                    {formatDuration(flight.layovers[legIdx].durationMins)} layover · {flight.layovers[legIdx].name} ({flight.layovers[legIdx].id})
                                 </div>
                              )}
                           </div>
                         ))}
                       </div>
                    </div>
                 )}
              </div>
           ))}
         </div>
       )}
    </div>
  );
}
