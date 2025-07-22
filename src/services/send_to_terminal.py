"""Send text to Windows Terminal without focus using Windows API"""

import ctypes
import ctypes.wintypes
import time
import sys
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Windows constants
WM_CHAR = 0x0102
WM_KEYDOWN = 0x0100
WM_KEYUP = 0x0101
VK_RETURN = 0x0D

# Load Windows DLLs
user32 = ctypes.windll.user32

# Define callback type for EnumWindows
EnumWindowsProc = ctypes.WINFUNCTYPE(
    ctypes.c_bool, 
    ctypes.POINTER(ctypes.c_int), 
    ctypes.POINTER(ctypes.c_int)
)

class TerminalSender:
    """Sends text to Windows Terminal without requiring focus"""
    
    def __init__(self):
        # Look for any window with "claude" or "Red Queen" in the title
        self.window_patterns = ["claude", "Claude", "CLAUDE", "Red Queen", "red queen", "RED QUEEN"]
        self.window_class = "CASCADIA_HOSTING_WINDOW_CLASS"
        
    def _enum_windows_callback(self, hwnd, lParam):
        """Callback for EnumWindows"""
        # Get window text length
        length = user32.GetWindowTextLengthW(hwnd)
        if length == 0:
            return True
            
        # Get window text
        buff = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buff, length + 1)
        window_title = buff.value
        
        # Get window class
        class_buff = ctypes.create_unicode_buffer(256)
        user32.GetClassNameW(hwnd, class_buff, 256)
        window_class = class_buff.value
        
        # Check if this is a terminal window with claude in title
        if window_class == self.window_class:
            for pattern in self.window_patterns:
                if pattern in window_title:
                    # Store the handle in the list pointed to by lParam
                    handles = ctypes.cast(lParam, ctypes.POINTER(ctypes.py_object)).contents.value
                    handles.append(hwnd)
                    logger.debug(f"Found window: {window_title} (Class: {window_class}, Handle: {hwnd})")
                    break
            
        return True
    
    def find_terminal_window(self):
        """Find the Windows Terminal window handle"""
        logger.info("Searching for Windows Terminal with 'claude' in title")
        
        # Find all matching windows
        handles = []
        handles_ptr = ctypes.py_object(handles)
        
        # Create callback
        callback = EnumWindowsProc(self._enum_windows_callback)
        
        # Enumerate windows
        user32.EnumWindows(callback, ctypes.pointer(handles_ptr))
        
        if handles:
            # Use the first matching window
            logger.info(f"Found Windows Terminal window: {handles[0]}")
            return handles[0]
        
        logger.warning("No Windows Terminal window found with 'claude' in title")
        return None
    
    def find_child_windows(self, parent_hwnd):
        """Find all child windows of a parent window"""
        children = []
        
        def enum_child_callback(hwnd, lParam):
            class_buff = ctypes.create_unicode_buffer(256)
            user32.GetClassNameW(hwnd, class_buff, 256)
            window_class = class_buff.value
            
            children.append((hwnd, window_class))
            return True
            
        callback = EnumWindowsProc(enum_child_callback)
        user32.EnumChildWindows(parent_hwnd, callback, 0)
        
        return children
    
    def find_input_window(self, root_hwnd):
        """Find the specific input window in Windows Terminal"""
        children = self.find_child_windows(root_hwnd)
        
        # We need the LAST InputSite window
        input_windows = []
        for child_hwnd, child_class in children:
            if "Windows.UI.Input.InputSite.WindowClass" in child_class:
                input_windows.append(child_hwnd)
                
        if input_windows:
            # Use the last one
            target_hwnd = input_windows[-1]
            logger.info(f"Using input window: {target_hwnd}")
            return target_hwnd
                
        logger.warning("Could not find InputSite window")
        return None
    
    def send_text(self, text, send_enter=True):
        """Send text to the terminal window"""
        hwnd = self.find_terminal_window()
        if not hwnd:
            logger.error("Cannot send text: Terminal window not found")
            return False
            
        # Find the specific input window
        input_hwnd = self.find_input_window(hwnd)
        if not input_hwnd:
            logger.warning("Could not find input window, trying main window")
            input_hwnd = hwnd
            
        logger.info(f"Sending text to window {input_hwnd}: {text[:50]}...")
        
        # Send each character
        for char in text:
            char_code = ord(char)
            if not user32.PostMessageW(input_hwnd, WM_CHAR, char_code, 0):
                logger.error(f"Failed to send character: {char}")
                return False
            time.sleep(0.01)  # 10ms delay between characters
        
        # Send Enter key if requested
        if send_enter:
            logger.debug("Sending Enter key")
            user32.PostMessageW(input_hwnd, WM_KEYDOWN, VK_RETURN, 0)
            time.sleep(0.01)
            user32.PostMessageW(input_hwnd, WM_KEYUP, VK_RETURN, 0)
            
        logger.info("Text sent successfully")
        return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python send_to_terminal.py <text>")
        sys.exit(1)
    
    text = sys.argv[1]
    sender = TerminalSender()
    
    if sender.send_text(text):
        print("Message sent successfully")
        sys.exit(0)
    else:
        print("Failed to send message")
        sys.exit(1)