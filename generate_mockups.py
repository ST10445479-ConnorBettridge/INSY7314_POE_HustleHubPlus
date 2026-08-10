from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mockups")
os.makedirs(OUTPUT_DIR, exist_ok=True)

W, H = 1280, 800
BG = "#0f172a"
CARD_BG = "#1e293b"
CARD_BG2 = "#334155"
ACCENT = "#3b82f6"
ACCENT2 = "#8b5cf6"
GREEN = "#22c55e"
AMBER = "#f59e0b"
RED = "#ef4444"
TEXT_PRIMARY = "#f1f5f9"
TEXT_SECONDARY = "#94a3b8"
WHITE = "#ffffff"

def load_font(size, bold=False):
    try:
        if bold:
            return ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", size)
        return ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", size)
    except:
        return ImageFont.load_default()

def rounded_rect(draw, xy, radius, fill, outline=None):
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=fill, outline=outline)

def draw_avatar(draw, cx, cy, r, initials):
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=ACCENT)
    fnt = load_font(r)
    bbox = fnt.getbbox(initials)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw//2, cy - th//2 - 2), initials, fill=WHITE, font=fnt)

def draw_star_rating(draw, x, y, rating, max_r=5):
    for i in range(max_r):
        color = AMBER if i < rating else CARD_BG2
        draw.text((x + i * 22, y), "\u2605", fill=color, font=load_font(16))

def draw_sidebar(draw, active_idx=0):
    sidebar_w = 240
    draw.rectangle([0, 0, sidebar_w, H], fill="#0f172a")
    draw.line([sidebar_w, 0, sidebar_w, H], fill="#1e293b", width=1)
    
    # Logo
    fnt_logo = load_font(22, bold=True)
    draw.text((24, 28), "HustleHub+", fill=ACCENT, font=fnt_logo)
    draw.text((24, 55), "Freelance Marketplace", fill=TEXT_SECONDARY, font=load_font(11))
    
    # Nav items
    items = [
        ("\U0001f3e0", "Dashboard", False),
        ("\U0001f50d", "Browse Gigs", True),
        ("\U0001f4cb", "My Gigs", False),
        ("\U0001f4c5", "Bookings", False),
        ("\U0001f4b0", "Earnings", False),
        ("\U0001f4c8", "Tax Estimates", False),
        ("\u2699\ufe0f", "Settings", False),
    ]
    
    y_start = 100
    for i, (icon, label, active) in enumerate(items):
        y = y_start + i * 52
        if active or i == active_idx:
            draw.rounded_rectangle([12, y, sidebar_w-12, y+42], radius=8, fill="#1e293b")
        draw.text((36, y + 9), f"{icon}  {label}", fill=WHITE if active or i == active_idx else TEXT_SECONDARY, font=load_font(14))
    
    # User at bottom
    draw_avatar(draw, 48, H-60, 22, "JD")
    draw.text((80, H-72), "John Doe", fill=WHITE, font=load_font(13, bold=True))
    draw.text((80, H-52), "Freelancer", fill=TEXT_SECONDARY, font=load_font(11))

# ============================================================
# MOCKUP 1: Freelancer Dashboard
# ============================================================
def create_dashboard():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw_sidebar(draw, 0)
    
    # Header
    draw.text((280, 28), "Dashboard", fill=WHITE, font=load_font(24, bold=True))
    draw.text((280, 58), "Welcome back, John! Here's your overview.", fill=TEXT_SECONDARY, font=load_font(13))
    
    # Stats cards
    cx = 280
    stats = [
        ("Total Earnings", "R 12,450.00", GREEN, "\u2191 15%"),
        ("Active Gigs", "8", ACCENT, "3 pending"),
        ("Bookings", "24", ACCENT2, "This month"),
        ("Est. Tax", "R 1,867.50", AMBER, "Due quarterly"),
    ]
    for title, value, color, sub in stats:
        rounded_rect(draw, [cx, 90, cx+220, 175], 12, CARD_BG)
        draw.text((cx+16, 106), title, fill=TEXT_SECONDARY, font=load_font(12))
        draw.text((cx+16, 126), value, fill=WHITE, font=load_font(20, bold=True))
        draw.rounded_rectangle([cx+16, 152, cx+16+80, 165], 4, fill=CARD_BG2)
        draw.text((cx+20, 152), sub, fill=color, font=load_font(10))
        cx += 240
    
    # Chart placeholder - Income Overview
    rounded_rect(draw, [280, 200, 780, 420], 12, CARD_BG)
    draw.text((300, 216), "Income Overview", fill=WHITE, font=load_font(15, bold=True))
    draw.text((300, 238), "Last 6 months", fill=TEXT_SECONDARY, font=load_font(11))
    
    # Bar chart
    chart_x, chart_y = 310, 280
    bars = [("Jan", 40), ("Feb", 55), ("Mar", 35), ("Apr", 70), ("May", 60), ("Jun", 85)]
    bar_w = 55
    max_h = 100
    for i, (label, val) in enumerate(bars):
        bx = chart_x + i * (bar_w + 18)
        bh = int(val / 100 * max_h)
        by = chart_y + (max_h - bh)
        draw.rounded_rectangle([bx, by, bx+bar_w, chart_y+max_h], 4, CARD_BG2)
        draw.rounded_rectangle([bx, by, bx+bar_w, chart_y+max_h], 4, ACCENT)
        draw.text((bx + 10, chart_y + max_h + 8), label, fill=TEXT_SECONDARY, font=load_font(10))
        draw.text((bx + 5, by - 18), str(val), fill=WHITE, font=load_font(10))
    
    # Recent transactions
    rounded_rect(draw, [800, 200, 1240, 420], 12, CARD_BG)
    draw.text((820, 216), "Recent Transactions", fill=WHITE, font=load_font(15, bold=True))
    
    txs = [
        ("Web Dev Project", "+R 2,500", GREEN),
        ("Logo Design", "+R 800", GREEN),
        ("API Integration", "+R 1,500", GREEN),
        ("UI Consultation", "+R 600", GREEN),
    ]
    for i, (desc, amt, clr) in enumerate(txs):
        ty = 250 + i * 38
        draw.rounded_rectangle([820, ty, 1220, ty+32], 6, CARD_BG2)
        draw.text((836, ty + 7), desc, fill=WHITE, font=load_font(12))
        draw.text((1140, ty + 7), amt, fill=clr, font=load_font(12, bold=True))
    
    # Recent activity
    rounded_rect(draw, [280, 440, 1240, 620], 12, CARD_BG)
    draw.text((300, 456), "Recent Activity", fill=WHITE, font=load_font(15, bold=True))
    
    activities = [
        ("New booking", "Sarah booked 'React Dashboard'", "2 min ago"),
        ("Payment received", "R 2,500 for 'Web Dev Project'", "1 hour ago"),
        ("Gig approved", "Your gig 'API Development' is live", "3 hours ago"),
        ("Review received", "\u2605\u2605\u2605\u2605\u2605  'Excellent work!'", "1 day ago"),
    ]
    for i, (title, desc, time) in enumerate(activities):
        ay = 490 + i * 30
        draw.text((300, ay), f"{title}", fill=ACCENT, font=load_font(12, bold=True))
        draw.text((440, ay), desc, fill=WHITE, font=load_font(12))
        draw.text((1100, ay), time, fill=TEXT_SECONDARY, font=load_font(11))
        if i < len(activities) - 1:
            draw.line([300, ay+25, 1220, ay+25], fill=CARD_BG2, width=1)
    
    img.save(os.path.join(OUTPUT_DIR, "01_dashboard.png"))
    print("Created: 01_dashboard.png")

# ============================================================
# MOCKUP 2: Browse Gigs
# ============================================================
def create_browse_gigs():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw_sidebar(draw, 1)
    
    # Header
    draw.text((280, 28), "Browse Gigs", fill=WHITE, font=load_font(24, bold=True))
    
    # Search bar
    rounded_rect(draw, [280, 70, 750, 110], 8, CARD_BG)
    draw.text((300, 85), "\U0001f50d  Search for services...", fill=TEXT_SECONDARY, font=load_font(13))
    
    # Filter buttons
    filters = ["All", "Web Dev", "Design", "Writing", "Marketing", "Music", "Video"]
    fx = 280
    for f in filters:
        active = f == "All"
        bg = ACCENT if active else CARD_BG2
        fc = WHITE if active else TEXT_SECONDARY
        rounded_rect(draw, [fx, 130, fx+80, 158], 6, bg)
        draw.text((fx + 16, 137), f, fill=fc, font=load_font(12))
        fx += 92
    
    # Gig cards
    gigs = [
        ("React Developer", "Build modern web applications with React", "R 350/hr", "4.8", "John D.", "web"),
        ("UI/UX Designer", "Beautiful interfaces for your product", "R 280/hr", "4.9", "Sarah K.", "design"),
        ("Content Writer", "SEO-optimized blog posts & articles", "R 150/hr", "4.7", "Mike R.", "writing"),
        ("API Specialist", "RESTful & GraphQL API development", "R 400/hr", "4.6", "Anna L.", "web"),
        ("Logo Designer", "Professional brand identity design", "R 200/hr", "4.9", "Emma W.", "design"),
        ("Video Editor", "Professional video editing & post-production", "R 300/hr", "4.5", "Chris P.", "video"),
    ]
    
    cards_per_row = 3
    card_w = 290
    card_h = 240
    gap = 20
    start_x = 280
    start_y = 180
    
    for i, (title, desc, price, rating, name, cat) in enumerate(gigs):
        col = i % cards_per_row
        row = i // cards_per_row
        if row >= 2:
            break
        cx = start_x + col * (card_w + gap)
        cy = start_y + row * (card_h + gap)
        
        rounded_rect(draw, [cx, cy, cx+card_w, cy+card_h], 12, CARD_BG)
        
        # Category badge
        cat_colors = {"web": ACCENT, "design": ACCENT2, "writing": GREEN, "video": RED}
        cc = cat_colors.get(cat, ACCENT)
        draw.rounded_rectangle([cx+12, cy+12, cx+90, cy+30], 4, cc)
        draw.text((cx+18, cy+14), cat.capitalize(), fill=WHITE, font=load_font(10, bold=True))
        
        # Avatar + name
        draw_avatar(draw, cx+28, cy+55, 16, name.split()[0][0] + name.split()[1][0])
        draw.text((cx+50, cy+48), name, fill=WHITE, font=load_font(12, bold=True))
        draw_star_rating(draw, cx+50, cy+66, int(rating[0]))
        draw.text((cx+50+5*22+4, cy+66), rating, fill=TEXT_SECONDARY, font=load_font(10))
        
        # Title
        draw.text((cx+16, cy+92), title, fill=WHITE, font=load_font(14, bold=True))
        
        # Description
        draw.text((cx+16, cy+115), desc[:35] + "...", fill=TEXT_SECONDARY, font=load_font(11))
        
        # Price
        draw.text((cx+16, cy+195), price, fill=GREEN, font=load_font(16, bold=True))
        draw.text((cx+16+75, cy+200), "/hr", fill=TEXT_SECONDARY, font=load_font(10))
        
        # Book button
        rounded_rect(draw, [cx+card_w-100, cy+190, cx+card_w-12, cy+222], 6, ACCENT)
        draw.text((cx+card_w-82, cy+200), "Book Now", fill=WHITE, font=load_font(11, bold=True))
    
    img.save(os.path.join(OUTPUT_DIR, "02_browse_gigs.png"))
    print("Created: 02_browse_gigs.png")

# ============================================================
# MOCKUP 3: Gig Detail
# ============================================================
def create_gig_detail():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw_sidebar(draw, 1)
    
    # Back button
    draw.text((280, 28), "\u2190  Back to Gigs", fill=ACCENT, font=load_font(13))
    draw.text((280, 55), "React Developer", fill=WHITE, font=load_font(24, bold=True))
    draw.text((280, 83), "Build modern web applications with React", fill=TEXT_SECONDARY, font=load_font(13))
    
    # Main detail card
    rounded_rect(draw, [280, 110, 880, 520], 12, CARD_BG)
    
    # Gig banner area
    draw.rounded_rectangle([300, 130, 860, 260], 10, CARD_BG2)
    draw.text((560, 185), "Gig Preview", fill=TEXT_SECONDARY, font=load_font(16))
    draw.text((520, 210), "[Portfolio / Preview Image]", fill=TEXT_SECONDARY, font=load_font(11))
    
    # Seller info
    draw_avatar(draw, 320, 300, 24, "JD")
    draw.text((356, 285), "John Doe", fill=WHITE, font=load_font(15, bold=True))
    draw.text((356, 307), "Top Rated Freelancer", fill=GREEN, font=load_font(11))
    draw_star_rating(draw, 356, 325, 5)
    draw.text((356+110, 325), "4.8 (120 reviews)", fill=TEXT_SECONDARY, font=load_font(10))
    
    # Description
    draw.text((300, 360), "About This Gig", fill=WHITE, font=load_font(14, bold=True))
    draw.text((300, 382), 
        "I will build modern, responsive React applications tailored to your needs.\n"
        "With 5+ years of experience in frontend development, I deliver clean,\n"
        "maintainable code with exceptional user experiences.",
        fill=TEXT_SECONDARY, font=load_font(11))
    
    # Features
    draw.text((300, 440), "What's Included", fill=WHITE, font=load_font(14, bold=True))
    features = ["Responsive Design", "Clean Code", "API Integration", "1 Month Support"]
    fx = 300
    for f in features:
        rounded_rect(draw, [fx, 466, fx+120, 488], 4, CARD_BG2)
        draw.text((fx+8, 472), f, fill=WHITE, font=load_font(10))
        fx += 132
    
    # Pricing sidebar
    rounded_rect(draw, [900, 110, 1240, 420], 12, CARD_BG)
    draw.text((920, 126), "Pricing", fill=WHITE, font=load_font(16, bold=True))
    
    # Basic package
    draw.rounded_rectangle([920, 150, 1220, 210], 8, CARD_BG2)
    fnt = load_font(14, bold=True)
    draw.text((936, 158), "Basic", fill=WHITE, font=fnt)
    draw.text((936, 180), "R 350/hr", fill=GREEN, font=load_font(20, bold=True))
    draw.text((1080, 180), "2 days", fill=TEXT_SECONDARY, font=load_font(11))
    
    # Standard package
    draw.rounded_rectangle([920, 222, 1220, 282], 8, CARD_BG2)
    draw.text((936, 230), "Standard", fill=WHITE, font=fnt)
    draw.text((936, 252), "R 280/hr", fill=GREEN, font=load_font(20, bold=True))
    draw.text((1080, 252), "5 days", fill=TEXT_SECONDARY, font=load_font(11))
    
    # Premium package
    draw.rounded_rectangle([920, 294, 1220, 354], 8, CARD_BG2)
    draw.text((936, 302), "Premium", fill=WHITE, font=fnt)
    draw.text((936, 324), "R 220/hr", fill=GREEN, font=load_font(20, bold=True))
    draw.text((1080, 324), "10 days", fill=TEXT_SECONDARY, font=load_font(11))
    
    # Contact button
    rounded_rect(draw, [920, 374, 1220, 410], 8, ACCENT)
    draw.text((1050, 387), "Contact Seller", fill=WHITE, font=load_font(13, bold=True))
    
    img.save(os.path.join(OUTPUT_DIR, "03_gig_detail.png"))
    print("Created: 03_gig_detail.png")

# ============================================================
# MOCKUP 4: Earnings & Tax
# ============================================================
def create_earnings_tax():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw_sidebar(draw, 5)
    
    # Header
    draw.text((280, 28), "Tax Estimates", fill=WHITE, font=load_font(24, bold=True))
    draw.text((280, 58), "Estimated tax obligations based on your earnings.", fill=TEXT_SECONDARY, font=load_font(13))
    
    # Tax summary card
    rounded_rect(draw, [280, 90, 780, 240], 12, CARD_BG)
    draw.text((300, 106), "Estimated Tax Due", fill=TEXT_SECONDARY, font=load_font(12))
    draw.text((300, 128), "R 1,867.50", fill=WHITE, font=load_font(28, bold=True))
    draw.text((300, 162), "Tax Period: Q3 2026", fill=TEXT_SECONDARY, font=load_font(11))
    draw.text((300, 180), "Due Date: 30 September 2026", fill=AMBER, font=load_font(11))
    
    # Tax breakdown
    rounded_rect(draw, [300, 200, 760, 230], 6, CARD_BG2)
    draw.text((316, 207), "\u26a0\ufe0f  Estimated. Consult a tax professional for official filings.", fill=AMBER, font=load_font(10))
    
    # Earnings breakdown
    rounded_rect(draw, [800, 90, 1240, 240], 12, CARD_BG)
    draw.text((820, 106), "Earnings Breakdown", fill=WHITE, font=load_font(15, bold=True))
    
    items = [("Gross Income", "R 12,450.00", WHITE), ("Business Expenses", "-R 2,000.00", RED), ("Tax Deductions", "-R 500.00", RED), ("Net Taxable Income", "R 9,950.00", GREEN)]
    for i, (label, value, color) in enumerate(items):
        iy = 138 + i * 24
        draw.text((820, iy), label, fill=TEXT_SECONDARY, font=load_font(11))
        draw.text((1120, iy), value, fill=color, font=load_font(11, bold=True))
    
    # Tax calculation details
    rounded_rect(draw, [280, 260, 1240, 500], 12, CARD_BG)
    draw.text((300, 276), "Tax Calculation Details", fill=WHITE, font=load_font(15, bold=True))
    
    # Table header
    header_y = 310
    cols = ["Category", "Amount", "Tax Rate", "Estimated Tax"]
    col_widths = [200, 200, 150, 200]
    col_x = [300, 500, 700, 900]
    
    for i, (h, w, x) in enumerate(zip(cols, col_widths, col_x)):
        draw.text((x, header_y), h, fill=TEXT_SECONDARY, font=load_font(11, bold=True))
    
    draw.line([300, header_y+20, 1220, header_y+20], fill=CARD_BG2, width=1)
    
    tax_rows = [
        ("Service Income (Standard)", "R 10,000.00", "18%", "R 1,800.00"),
        ("Service Income (Reduced)", "R 2,450.00", "15%", "R 367.50"),
        ("Capital Gains", "R 0.00", "0%", "R 0.00"),
    ]
    
    for i, (cat, amt, rate, tax) in enumerate(tax_rows):
        ry = header_y + 32 + i * 28
        draw.text((300, ry), cat, fill=WHITE, font=load_font(11))
        draw.text((500, ry), amt, fill=WHITE, font=load_font(11))
        draw.text((700, ry), rate, fill=TEXT_SECONDARY, font=load_font(11))
        draw.text((900, ry), tax, fill=WHITE, font=load_font(11, bold=True))
        if i < len(tax_rows) - 1:
            draw.line([300, ry+24, 1220, ry+24], fill=CARD_BG2, width=1)
    
    # Total row
    total_y = header_y + 32 + len(tax_rows) * 28 + 8
    draw.line([300, total_y-4, 1220, total_y-4], fill=CARD_BG2, width=2)
    draw.text((300, total_y+4), "Total", fill=WHITE, font=load_font(13, bold=True))
    draw.text((500, total_y+4), "R 12,450.00", fill=WHITE, font=load_font(13, bold=True))
    draw.text((700, total_y+4), "", fill=TEXT_SECONDARY, font=load_font(11))
    draw.text((900, total_y+4), "R 1,867.50", fill=GREEN, font=load_font(13, bold=True))
    
    img.save(os.path.join(OUTPUT_DIR, "04_earnings_tax.png"))
    print("Created: 04_earnings_tax.png")

# ============================================================
# MOCKUP 5: Login Page
# ============================================================
def create_login():
    W, H = 1280, 800
    img = Image.new("RGB", (W, H), "#0f172a")
    draw = ImageDraw.Draw(img)
    
    # Left side - branding
    draw.rectangle([0, 0, 640, H], fill="#0f172a")
    
    # Large brand
    fnt = load_font(42, bold=True)
    draw.text((100, 280), "HustleHub+", fill=ACCENT, font=fnt)
    draw.text((100, 335), "Freelance Marketplace", fill=TEXT_SECONDARY, font=load_font(18))
    draw.text((100, 370), "Connect with top freelancers and", fill=TEXT_SECONDARY, font=load_font(13))
    draw.text((100, 390), "grow your business securely.", fill=TEXT_SECONDARY, font=load_font(13))
    
    # Feature bullets
    features = ["\u2713  Secure payments & escrow", "\u2713  Role-based access control", "\u2713  Tax estimates & tracking", "\u2713  End-to-end encryption"]
    for i, f in enumerate(features):
        draw.text((100, 440 + i*28), f, fill=WHITE, font=load_font(13))
    
    # Right side - Login card
    card_x, card_y = 740, 160
    card_w, card_h = 440, 480
    rounded_rect(draw, [card_x, card_y, card_x+card_w, card_y+card_h], 16, CARD_BG)
    
    # Header
    draw.text((card_x+36, card_y+36), "Welcome Back", fill=WHITE, font=load_font(22, bold=True))
    draw.text((card_x+36, card_y+68), "Sign in to your account", fill=TEXT_SECONDARY, font=load_font(13))
    
    # Email field
    draw.text((card_x+36, card_y+118), "Email Address", fill=TEXT_SECONDARY, font=load_font(11))
    rounded_rect(draw, [card_x+36, card_y+138, card_x+404, card_y+172], 8, CARD_BG2)
    draw.text((card_x+52, card_y+148), "john@example.com", fill=TEXT_SECONDARY, font=load_font(13))
    
    # Password field
    draw.text((card_x+36, card_y+200), "Password", fill=TEXT_SECONDARY, font=load_font(11))
    rounded_rect(draw, [card_x+36, card_y+220, card_x+404, card_y+254], 8, CARD_BG2)
    draw.text((card_x+52, card_y+230), "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", fill=TEXT_SECONDARY, font=load_font(13))
    draw.text((card_x+380, card_y+230), "\U0001f441", fill=TEXT_SECONDARY, font=load_font(13))
    
    # Remember me
    draw.rounded_rectangle([card_x+36, card_y+272, card_x+56, card_y+292], 4, ACCENT)
    draw.text((card_x+68, card_y+272), "Remember me", fill=WHITE, font=load_font(12))
    draw.text((card_x+320, card_y+272), "Forgot password?", fill=ACCENT, font=load_font(12))
    
    # Login button
    rounded_rect(draw, [card_x+36, card_y+316, card_x+404, card_y+356], 8, ACCENT)
    draw.text((card_x+200, card_y+333), "Sign In", fill=WHITE, font=load_font(14, bold=True))
    
    # Divider
    draw.line([card_x+36, card_y+384, card_x+404, card_y+384], fill=CARD_BG2, width=1)
    draw.text((card_x+170, card_y+390), "OR", fill=TEXT_SECONDARY, font=load_font(11))
    
    # Google sign in
    rounded_rect(draw, [card_x+36, card_y+416, card_x+404, card_y+456], 8, CARD_BG2)
    draw.text((card_x+180, card_y+433), "Continue with Google", fill=WHITE, font=load_font(13))
    
    # Register link
    draw.text((card_x+100, card_y+472), "Don't have an account?", fill=TEXT_SECONDARY, font=load_font(12))
    draw.text((card_x+300, card_y+472), "Sign Up", fill=ACCENT, font=load_font(12, bold=True))
    
    img.save(os.path.join(OUTPUT_DIR, "05_login.png"))
    print("Created: 05_login.png")

# ============================================================
# MOCKUP 6: Booking Confirmation
# ============================================================
def create_booking():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw_sidebar(draw, 3)
    
    # Header
    draw.text((280, 28), "My Bookings", fill=WHITE, font=load_font(24, bold=True))
    
    # Tabs
    tabs = ["Active", "Completed", "Cancelled", "All"]
    tx = 280
    for i, t in enumerate(tabs):
        active = i == 0
        bg = ACCENT if active else "transparent"
        fc = WHITE if active else TEXT_SECONDARY
        if active:
            draw.rounded_rectangle([tx, 70, tx+90, 96], 6, bg)
        draw.text((tx+20, 77), t, fill=fc, font=load_font(13))
        tx += 100
    
    # Booking cards
    bookings = [
        ("React Dashboard Development", "Sarah Johnson", "R 5,250", "In Progress", ACCENT, "70%"),
        ("E-commerce API Integration", "Mike Peters", "R 3,200", "Completed", GREEN, "100%"),
        ("Mobile App UI Design", "Emma Wilson", "R 2,800", "In Review", AMBER, "90%"),
        ("Database Migration", "Tom Harris", "R 4,000", "Pending", TEXT_SECONDARY, "0%"),
    ]
    
    for i, (title, client, price, status, color, progress) in enumerate(bookings):
        by = 120 + i * 115
        
        rounded_rect(draw, [280, by, 1240, by+105], 12, CARD_BG)
        
        # Avatar
        initials = "".join([p[0] for p in client.split()])
        draw_avatar(draw, 320, by+40, 22, initials)
        
        # Title & client
        draw.text((356, by+16), title, fill=WHITE, font=load_font(14, bold=True))
        draw.text((356, by+40), client, fill=TEXT_SECONDARY, font=load_font(12))
        draw.text((356, by+60), "Started: 15 Jul 2026", fill=TEXT_SECONDARY, font=load_font(10))
        
        # Progress bar
        bar_x, bar_y = 700, by+45
        bar_w, bar_h = 200, 8
        draw.rounded_rectangle([bar_x, bar_y, bar_x+bar_w, bar_y+bar_h], 4, CARD_BG2)
        pct_w = int(int(progress.strip('%')) / 100 * bar_w)
        draw.rounded_rectangle([bar_x, bar_y, bar_x+pct_w, bar_y+bar_h], 4, color)
        draw.text((bar_x, bar_y+14), f"Progress: {progress}", fill=TEXT_SECONDARY, font=load_font(10))
        
        # Price
        draw.text((1100, by+20), price, fill=WHITE, font=load_font(16, bold=True))
        
        # Status badge
        draw.rounded_rectangle([1100, by+48, 1180, by+68], 4, color)
        draw.text((1106, by+52), status, fill=WHITE if status != "Pending" else "#000", font=load_font(9, bold=True))
        
        # Action button
        rounded_rect(draw, [1100, by+76, 1200, by+96], 6, ACCENT)
        draw.text((1115, by+80), "View", fill=WHITE, font=load_font(10))
    
    img.save(os.path.join(OUTPUT_DIR, "06_bookings.png"))
    print("Created: 06_bookings.png")

# ============================================================
# RUN ALL
# ============================================================
create_dashboard()
create_browse_gigs()
create_gig_detail()
create_earnings_tax()
create_login()
create_booking()

print(f"\nAll mockups saved to: {OUTPUT_DIR}")
