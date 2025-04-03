
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    // Initial check
    checkIfMobile()
    
    // Set up event listener
    const handleResize = () => {
      checkIfMobile()
    }
    
    window.addEventListener("resize", handleResize)
    
    // Cleanup
    return () => window.removeEventListener("resize", handleResize)
  }, [])
  
  const checkIfMobile = () => {
    // Use both matchMedia and window.innerWidth for better reliability
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    setIsMobile(mql.matches || window.innerWidth < MOBILE_BREAKPOINT)
  }

  // Return the current mobile state, defaulting to true until we know for sure
  // This ensures mobile-first layout is applied initially
  return isMobile
}
